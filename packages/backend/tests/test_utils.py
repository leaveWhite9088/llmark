"""
测试工具模块：utils/jwt.py、utils/geo.py、utils/anti_abuse.py、db/queries/helpers.py。

覆盖场景：正常流程、异常输入、边界条件、并发安全。
"""

import asyncio
from datetime import date, datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from db.queries.helpers import (
    _bucket_time,
    _compute_streak_days_from_dates,
    _interval_to_delta,
    _parse_dt,
    _percentile,
    classify_input_length_bucket,
    sort_items,
)
from utils.anti_abuse import _device_windows, check_device_rate_limit
from utils.geo import _first_valid_ip, get_client_ip
from utils.jwt import create_token, verify_token


# ---------------------------------------------------------------------------
# utils/jwt.py
# ---------------------------------------------------------------------------

class TestJwt:
    def test_create_and_verify_token(self):
        """创建 token 后能正确解析出 user_id。"""
        token = create_token(42)
        assert isinstance(token, str)
        assert verify_token(token) == 42

    def test_verify_expired_token_returns_none(self):
        """过期 token 返回 None。"""
        # 创建一个已过期 1 天的 token
        from config import settings
        from jose import jwt as jose_jwt

        expired_payload = {
            "sub": "99",
            "exp": datetime.now(timezone.utc) - timedelta(days=1),
        }
        expired_token = jose_jwt.encode(expired_payload, settings.jwt_secret, algorithm="HS256")
        assert verify_token(expired_token) is None

    def test_verify_tampered_token_returns_none(self):
        """篡改后的 token 返回 None。"""
        token = create_token(1)
        tampered = token[:-5] + "xxxxx"
        assert verify_token(tampered) is None

    def test_verify_empty_token_returns_none(self):
        """空字符串 token 返回 None。"""
        assert verify_token("") is None

    def test_verify_invalid_format_returns_none(self):
        """非 JWT 格式字符串返回 None。"""
        assert verify_token("not-a-jwt") is None


# ---------------------------------------------------------------------------
# utils/geo.py
# ---------------------------------------------------------------------------

class TestGeoFirstValidIp:
    def test_first_valid_ip_v4(self):
        """从候选列表中提取第一个有效 IPv4。"""
        assert _first_valid_ip(["  ", "192.168.1.1", "10.0.0.1"]) == "192.168.1.1"

    def test_first_valid_ip_v6(self):
        """支持 IPv6 地址。"""
        assert _first_valid_ip(["::1", "192.168.1.1"]) == "::1"

    def test_first_valid_ip_none(self):
        """无有效 IP 时返回 None。"""
        assert _first_valid_ip(["", "not-an-ip", "abc"]) is None


class TestGeoGetClientIp:
    def _make_request(self, headers=None, client_host=None):
        """构造一个模拟的 FastAPI Request。"""
        request = MagicMock()
        request.headers = headers or {}
        request.client = MagicMock()
        request.client.host = client_host or "127.0.0.1"
        return request

    def test_cf_connecting_ip(self):
        """优先读取 CF-Connecting-IP。"""
        req = self._make_request(headers={"cf-connecting-ip": "1.2.3.4"})
        assert get_client_ip(req) == "1.2.3.4"

    def test_x_forwarded_for_first_valid(self):
        """X-Forwarded-For 取第一个有效 IP。"""
        req = self._make_request(headers={"x-forwarded-for": "invalid, 10.0.0.1, 10.0.0.2"})
        assert get_client_ip(req) == "10.0.0.1"

    def test_x_real_ip(self):
        """X-Real-IP 有效时读取。"""
        req = self._make_request(headers={"x-real-ip": "8.8.8.8"})
        assert get_client_ip(req) == "8.8.8.8"

    def test_fallback_to_request_client(self):
        """无 header 时回退到 request.client.host。"""
        req = self._make_request(client_host="192.168.0.1")
        assert get_client_ip(req) == "192.168.0.1"

    def test_fallback_to_zero(self):
        """request.client 也为 None 时返回 0.0.0.0。"""
        req = self._make_request()
        req.client = None
        assert get_client_ip(req) == "0.0.0.0"


# ---------------------------------------------------------------------------
# utils/anti_abuse.py
# ---------------------------------------------------------------------------

class TestAntiAbuse:
    @pytest.fixture(autouse=True)
    def reset_windows(self):
        """每个测试前清空限流器内存。"""
        _device_windows.clear()
        yield
        _device_windows.clear()

    def test_rate_limit_allows_under_limit(self):
        """前 60 次请求应全部通过。"""
        async def _run():
            for _ in range(60):
                assert await check_device_rate_limit("device_a") is True
        asyncio.run(_run())

    def test_rate_limit_blocks_over_limit(self):
        """第 61 次请求应被拒绝。"""
        async def _run():
            for _ in range(60):
                await check_device_rate_limit("device_b")
            assert await check_device_rate_limit("device_b") is False
        asyncio.run(_run())

    def test_different_devices_independent(self):
        """不同设备互不影响。"""
        async def _run():
            for _ in range(60):
                await check_device_rate_limit("device_c")
            # device_d 应该是全新的，不应被限流
            assert await check_device_rate_limit("device_d") is True
        asyncio.run(_run())

    def test_expired_window_allows_new_requests(self):
        """模拟过期窗口清理后，请求应恢复通过。

        注意：由于 _device_windows 中存的是 time.time() 浮点数，
        我们无法真正等待 60 秒。这里通过直接操作内部状态来模拟过期。
        """
        device = "device_e"
        now = __import__("time").time()
        # 插入 61 条 70 秒前的记录（已过期）
        _device_windows[device] = [now - 70] * 61
        # 再插入一条新记录
        _device_windows[device].append(now)

        # 由于清理逻辑只在 _cleanup_counter >= 1000 时触发，
        # 这里手动调用清理函数来模拟
        from utils.anti_abuse import _do_cleanup_expired_windows

        _do_cleanup_expired_windows(now)
        assert len(_device_windows[device]) == 1

        async def _run():
            assert await check_device_rate_limit(device) is True
        asyncio.run(_run())


# ---------------------------------------------------------------------------
# db/queries/helpers.py
# ---------------------------------------------------------------------------

class TestClassifyInputLengthBucket:
    def test_short_boundary(self):
        assert classify_input_length_bucket(0) == "short"
        assert classify_input_length_bucket(4096) == "short"

    def test_medium_boundary(self):
        assert classify_input_length_bucket(4097) == "medium"
        assert classify_input_length_bucket(16384) == "medium"

    def test_long_boundary(self):
        assert classify_input_length_bucket(16385) == "long"
        assert classify_input_length_bucket(99999) == "long"


class TestParseDt:
    def test_isoformat(self):
        dt = _parse_dt("2024-01-15T08:30:00Z")
        assert dt.year == 2024
        assert dt.month == 1
        assert dt.day == 15
        assert dt.hour == 8
        assert dt.minute == 30

    def test_datetime_object(self):
        original = datetime(2024, 1, 15, 8, 30, tzinfo=timezone.utc)
        dt = _parse_dt(original)
        assert dt == original

    def test_naive_datetime_gets_utc(self):
        naive = datetime(2024, 1, 15, 8, 30)
        dt = _parse_dt(naive)
        assert dt.tzinfo == timezone.utc


class TestIntervalToDelta:
    def test_hours(self):
        assert _interval_to_delta("24 hours") == timedelta(hours=24)
        assert _interval_to_delta("1 hour") == timedelta(hours=1)

    def test_days(self):
        assert _interval_to_delta("7 days") == timedelta(days=7)
        assert _interval_to_delta("30 days") == timedelta(days=30)


class TestBucketTime:
    def test_bucket_day(self):
        dt = datetime(2024, 1, 15, 14, 30, 45, tzinfo=timezone.utc)
        result = _bucket_time(dt, "day")
        assert "T00:00:00" in result

    def test_bucket_hour(self):
        dt = datetime(2024, 1, 15, 14, 30, 45, tzinfo=timezone.utc)
        result = _bucket_time(dt, "hour")
        assert "T14:00:00" in result
        assert "T14:30" not in result


class TestPercentile:
    def test_empty_list(self):
        assert _percentile([], 0.5) == 0

    def test_single_element(self):
        assert _percentile([42], 0.5) == 42

    def test_median(self):
        assert _percentile([1, 2, 3, 4, 5], 0.5) == 3

    def test_p99(self):
        # range(101) = [0..100], idx = 100 * 0.99 = 99 -> lo=hi=99 -> 99
        assert _percentile(list(range(101)), 0.99) == 99


class TestComputeStreakDays:
    def test_empty(self):
        assert _compute_streak_days_from_dates([]) == 0

    def test_single_day(self):
        assert _compute_streak_days_from_dates([date(2024, 1, 15)]) == 1

    def test_consecutive_days(self):
        dates = [date(2024, 1, 15), date(2024, 1, 14), date(2024, 1, 13)]
        assert _compute_streak_days_from_dates(dates) == 3

    def test_broken_streak(self):
        """连续 3 天后中断，只计 3 天。"""
        dates = [date(2024, 1, 15), date(2024, 1, 14), date(2024, 1, 12)]
        assert _compute_streak_days_from_dates(dates) == 2

    def test_duplicate_dates(self):
        """重复日期不影响计算。"""
        dates = [date(2024, 1, 15), date(2024, 1, 15), date(2024, 1, 14)]
        assert _compute_streak_days_from_dates(dates) == 2


class TestSortItems:
    def test_sort_asc(self):
        items = [{"name": "b"}, {"name": "a"}, {"name": "c"}]
        sort_items(items, "name", "asc", {"name": lambda x: x["name"]})
        assert [i["name"] for i in items] == ["a", "b", "c"]

    def test_sort_desc(self):
        items = [{"name": "b"}, {"name": "a"}, {"name": "c"}]
        sort_items(items, "name", "desc", {"name": lambda x: x["name"]})
        assert [i["name"] for i in items] == ["c", "b", "a"]

    def test_unknown_sort_by_uses_default(self):
        """未知 sort_by 时使用 default_key。"""
        items = [{"val": 3}, {"val": 1}, {"val": 2}]
        sort_items(items, "unknown", "asc", {}, default_key=lambda x: x["val"])
        assert [i["val"] for i in items] == [1, 2, 3]

    def test_unknown_sort_by_no_default(self):
        """未知 sort_by 且无 default_key 时不排序。"""
        items = [{"val": 3}, {"val": 1}, {"val": 2}]
        sort_items(items, "unknown", "asc", {})
        assert [i["val"] for i in items] == [3, 1, 2]
