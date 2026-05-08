"""
测试 /report 端点。

覆盖场景：正常提交、参数校验失败、异常数据拦截、JWT token 绑定。
注意：device_id 必须是 UUID 格式（36 字符），且请求体需要 sdk_version 字段。
"""

import uuid


class TestReport:
    def _payload(self, **overrides) -> dict:
        """生成符合 ReportRequest 模型的默认请求体。"""
        return {
            "device_id": str(uuid.uuid4()),
            "provider": "openai",
            "model": "gpt-4",
            "prompt_tokens": 1000,
            "completion_tokens": 100,
            "ttft_ms": 100,
            "total_ms": 1100,
            "token": None,
            "sdk_version": "1.0.0",
            **overrides,
        }

    def test_create_report_success(self, client):
        """正常提交一条报告，返回 200。"""
        resp = client.post("/v1/report", json=self._payload())
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    def test_create_report_with_token_binds_user(self, client):
        """携带 token 提交报告后，设备应绑定到对应用户。"""
        from config import settings
        from utils.jwt import create_token

        device_id = str(uuid.uuid4())
        alice_id = client._test_user_ids["alice"]

        # 先不带 token 提交一条（匿名）
        client.post("/v1/report", json=self._payload(device_id=device_id))

        # 再带 token 提交（同设备）
        token = create_token(alice_id)
        resp = client.post("/v1/report", json=self._payload(device_id=device_id, token=token))
        assert resp.status_code == 200

        # 验证数据库中 device_bindings 已更新
        import asyncio
        import asyncpg

        async def _check():
            conn = await asyncpg.connect(settings.database_url)
            try:
                row = await conn.fetchrow(
                    "SELECT user_id FROM device_bindings WHERE device_id = $1",
                    device_id,
                )
                return row
            finally:
                await conn.close()

        row = asyncio.run(_check())
        assert row is not None
        assert row["user_id"] == alice_id

    def test_create_report_anomaly_rejected(self, client):
        """TPS 偏离历史均值 3 倍以上时应被拒绝。"""
        model_name = f"gpt-4-anomaly-{uuid.uuid4().hex[:8]}"

        # 先提交一条正常数据建立基准（tps ≈ 66）
        normal = self._payload(model=model_name)
        client.post("/v1/report", json=normal)

        # 再提交一条异常数据（tps = 1000，是基准的 15 倍）
        anomaly = self._payload(
            model=model_name,
            completion_tokens=10000,
            total_ms=500,
        )
        resp = client.post("/v1/report", json=anomaly)
        assert resp.status_code == 429
        assert "anomaly" in resp.json()["error"].lower()

    def test_create_report_missing_required_field(self, client):
        """缺少必填字段时返回 422 验证错误。"""
        payload = {"device_id": str(uuid.uuid4())}
        resp = client.post("/v1/report", json=payload)
        assert resp.status_code == 422

    def test_create_report_invalid_device_id(self, client):
        """device_id 不是 UUID 格式时返回 422。"""
        payload = self._payload(device_id="not-a-uuid")
        resp = client.post("/v1/report", json=payload)
        assert resp.status_code == 422

    def test_create_report_invalid_provider_chars(self, client):
        """provider 包含非法字符时返回 422。"""
        payload = self._payload(provider="open ai!")
        resp = client.post("/v1/report", json=payload)
        assert resp.status_code == 422

    def test_create_report_invalid_model_chars(self, client):
        """model 包含非法字符时返回 422。"""
        payload = self._payload(model="gpt@4")
        resp = client.post("/v1/report", json=payload)
        assert resp.status_code == 422

    def test_create_report_device_rate_limit(self, client):
        """同一设备在 60 秒内超过 60 次请求应被限流。"""
        device_id = str(uuid.uuid4())
        # 先发送 60 条正常请求
        for _ in range(60):
            resp = client.post("/v1/report", json=self._payload(device_id=device_id))
            assert resp.status_code == 200

        # 第 61 条应被限流
        resp = client.post("/v1/report", json=self._payload(device_id=device_id))
        assert resp.status_code == 429
