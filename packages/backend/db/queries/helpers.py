import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from constants import DATETIME_FORMATS


SortKey = Callable[[dict[str, Any]], Any]


def sort_items(
    items: list[dict[str, Any]],
    sort_by: str,
    sort_order: str,
    sort_map: dict[str, SortKey],
    default_key: SortKey | None = None,
) -> None:
    """通用列表排序。适用于所有字段同方向排序的场景。

    对于需要"混合排序"（某些字段升序、某些字段降序）的场景，
    请在调用方自行处理负值后传入 sort_order="asc"。
    """
    reverse = sort_order == "desc"
    key_fn = sort_map.get(sort_by, default_key)
    if key_fn is None:
        return
    items.sort(key=key_fn, reverse=reverse)


def _parse_dt(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc) if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value).replace("Z", "")
    for fmt in DATETIME_FORMATS:
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return datetime.fromisoformat(text).replace(tzinfo=timezone.utc)


def _interval_to_delta(interval: str) -> timedelta:
    count, unit = interval.split()
    count_int = int(count)
    if unit.startswith("hour"):
        return timedelta(hours=count_int)
    return timedelta(days=count_int)


def _bucket_time(dt: datetime, bucket_unit: str) -> str:
    if bucket_unit == "day":
        return dt.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    return dt.replace(minute=0, second=0, microsecond=0).isoformat()


def _percentile(sorted_values: list[int], q: float) -> int:
    if not sorted_values:
        return 0
    if len(sorted_values) == 1:
        return int(round(sorted_values[0]))
    idx = (len(sorted_values) - 1) * q
    lo = math.floor(idx)
    hi = math.ceil(idx)
    if lo == hi:
        return int(round(sorted_values[lo]))
    value = sorted_values[lo] + (sorted_values[hi] - sorted_values[lo]) * (idx - lo)
    return int(round(value))


def _interval_str_to_cutoff_dt(interval: str | None) -> datetime | None:
    """将 '24 hours' / '7 days' 字符串转换为 utc 截止时间 datetime。"""
    if interval is None:
        return None
    count, unit = interval.split()
    count = int(count)
    if unit == "hours":
        return datetime.now(timezone.utc) - timedelta(hours=count)
    if unit == "days":
        return datetime.now(timezone.utc) - timedelta(days=count)
    raise ValueError(f"Unknown interval unit: {unit}")


def classify_input_length_bucket(prompt_tokens: int) -> str:
    if prompt_tokens <= 4096:
        return "short"
    if prompt_tokens <= 16384:
        return "medium"
    return "long"


def _isoformat_or_none(value: Any) -> str | None:
    if value is None:
        return None
    return _parse_dt(value).isoformat().replace("+00:00", "Z")


def _compute_streak_days_from_dates(date_values: list[datetime.date]) -> int:
    if not date_values:
        return 0
    active_dates = sorted(set(date_values), reverse=True)
    streak_days = 0
    cursor = active_dates[0]
    for active_date in active_dates:
        if active_date == cursor:
            streak_days += 1
            cursor = cursor - timedelta(days=1)
        elif active_date < cursor:
            break
    return streak_days


def aggregate_metrics(tps_values: list[float], ttft_values: list[int]) -> dict[str, Any]:
    """计算 TPS/TTFT 的平均值和样本数。"""
    n = len(tps_values)
    return {
        "avg_tps": round(sum(tps_values) / n, 2) if n else 0.0,
        "avg_ttft_ms": int(round(sum(ttft_values) / n)) if n else 0,
        "sample_count": n,
    }


def group_by_key(rows: list[dict[str, Any]], key_field: str) -> dict[str, dict[str, list]]:
    """按指定字段分组，收集 TPS/TTFT 值列表。"""
    groups: dict[str, dict[str, list]] = defaultdict(lambda: {"tps": [], "ttft": []})
    for row in rows:
        key = str(row[key_field])
        groups[key]["tps"].append(float(row["tps"]))
        groups[key]["ttft"].append(int(row["ttft_ms"]))
    return groups


__all__ = [
    "_bucket_time",
    "_compute_streak_days_from_dates",
    "_interval_to_delta",
    "_isoformat_or_none",
    "_parse_dt",
    "_percentile",
    "aggregate_metrics",
    "classify_input_length_bucket",
    "group_by_key",
]
