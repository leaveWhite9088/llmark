"""
测试厂商详情接口：/provider/{provider}/overview、
/provider/{provider}/models、/provider/{provider}/stats。

覆盖场景：正常查询、参数校验、响应字段完整性。
"""


class TestProviderOverview:
    def test_provider_overview(self, client):
        """查询厂商概览。"""
        resp = client.get("/v1/provider/openai/overview")
        assert resp.status_code == 200
        data = resp.json()
        assert "provider" in data
        assert "provider_name" in data
        assert "overview" in data
        overview = data["overview"]
        assert "avg_tps" in overview
        assert "total_models" in overview

    def test_provider_overview_with_bucket(self, client):
        """带 input_length_bucket 筛选。"""
        resp = client.get("/v1/provider/openai/overview?input_length_bucket=short")
        assert resp.status_code == 200


class TestProviderModels:
    def test_provider_models_default(self, client):
        """默认参数查询厂商下的模型列表。"""
        resp = client.get("/v1/provider/openai/models")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "available_filters" in data
        if data["items"]:
            item = data["items"][0]
            assert "model" in item
            assert "avg_tps" in item

    def test_provider_models_filter_by_model(self, client):
        """按 model 名称筛选。"""
        resp = client.get("/v1/provider/openai/models?model=gpt-4")
        assert resp.status_code == 200
        data = resp.json()
        for item in data["items"]:
            assert item["model"] == "GPT-4"


class TestProviderStats:
    def test_provider_stats(self, client):
        """查询厂商统计（计算分配）。"""
        resp = client.get("/v1/provider/openai/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "provider" in data
        assert "provider_name" in data
        assert "compute_allocation" in data
        if data["compute_allocation"]:
            alloc = data["compute_allocation"][0]
            assert "model" in alloc
            assert "sample_count" in alloc
            assert "percentage" in alloc

    def test_provider_overview_invalid_bucket(self, client):
        """非法 input_length_bucket 返回 422。"""
        resp = client.get("/v1/provider/openai/overview?input_length_bucket=invalid")
        assert resp.status_code == 422

    def test_provider_models_invalid_range(self, client):
        """非法 range 参数返回 422。"""
        resp = client.get("/v1/provider/openai/models?range=invalid")
        assert resp.status_code == 422
