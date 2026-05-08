"""
测试健康检查端点 /healthz 和请求体大小限制中间件。
"""


class TestHealthz:
    def test_healthz_returns_ok(self, client):
        """健康检查端点返回 200 和 ok=true。"""
        resp = client.get("/healthz")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True


class TestBodySizeLimit:
    def test_request_too_large_rejected(self, client):
        """请求体超过 10KB 时返回 413。"""
        large_body = "x" * 10241
        resp = client.post(
            "/v1/report",
            content=large_body,
            headers={"content-length": str(len(large_body))},
        )
        assert resp.status_code == 413
        assert "too large" in resp.json()["error"].lower()

    def test_request_just_under_limit_accepted(self, client):
        """请求体略低于 10KB 时应正常进入后续处理（会被后续校验拒绝，但不是 413）。"""
        body = "x" * 10240
        resp = client.post(
            "/v1/report",
            content=body,
            headers={"content-length": str(len(body))},
        )
        # 不是 413，说明通过了大小检查
        assert resp.status_code != 413
