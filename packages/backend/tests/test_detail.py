"""
测试详情接口：/detail、/detail-by-model。

覆盖场景：正常查询、参数校验、趋势数据结构。
"""


class TestDetail:
    def test_detail_default(self, client):
        """查询单厂商单模型的趋势数据。"""
        resp = client.get("/v1/detail?provider=openai&model=gpt-4")
        assert resp.status_code == 200
        data = resp.json()
        assert "trend" in data
        # trend 是时间序列数组
        assert isinstance(data["trend"], list)
        if data["trend"]:
            point = data["trend"][0]
            assert "time" in point
            assert "avg_tps" in point
            assert "avg_ttft_ms" in point
            assert "p99_ttft_ms" in point

    def test_detail_with_range(self, client):
        """不同时间范围应返回对应趋势。"""
        for range_val in ["24h", "7d", "30d"]:
            resp = client.get(f"/v1/detail?provider=openai&model=gpt-4&range={range_val}")
            assert resp.status_code == 200

    def test_detail_with_input_length_bucket(self, client):
        """按 input_length_bucket 筛选趋势数据。"""
        for bucket in ["short", "medium", "long"]:
            resp = client.get(
                f"/v1/detail?provider=openai&model=gpt-4&input_length_bucket={bucket}"
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "trend" in data

    def test_detail_missing_required_params(self, client):
        """缺少 provider 或 model 返回 422。"""
        resp = client.get("/v1/detail?provider=openai")
        assert resp.status_code == 422


class TestDetailByModel:
    def test_detail_by_model(self, client):
        """按模型聚合查询各厂商详情。"""
        resp = client.get("/v1/detail-by-model?model=gpt-4")
        assert resp.status_code == 200
        data = resp.json()
        assert "providers" in data
        if data["providers"]:
            provider = data["providers"][0]
            assert "provider" in provider
            assert "provider_name" in provider
            assert "metrics" in provider
            assert "trend" in provider

    def test_detail_by_model_with_bucket(self, client):
        """按 input_length_bucket 筛选。"""
        resp = client.get("/v1/detail-by-model?model=gpt-4&input_length_bucket=short")
        assert resp.status_code == 200

    def test_detail_invalid_range(self, client):
        """非法 range 参数返回 422。"""
        resp = client.get("/v1/detail?provider=openai&model=gpt-4&range=invalid")
        assert resp.status_code == 422

    def test_detail_invalid_bucket(self, client):
        """非法 input_length_bucket 返回 422。"""
        resp = client.get("/v1/detail?provider=openai&model=gpt-4&input_length_bucket=invalid")
        assert resp.status_code == 422
