"""
测试模型详情接口：/model/{model}/overview、/model/{model}/entries、
/model/{model}/provider-comparison。

覆盖场景：正常查询、参数校验、响应字段完整性、排序。
"""


class TestModelOverview:
    def test_model_overview(self, client):
        """查询模型概览。"""
        resp = client.get("/v1/model/gpt-4/overview")
        assert resp.status_code == 200
        data = resp.json()
        assert "model" in data
        assert "overview" in data
        overview = data["overview"]
        assert "avg_tps" in overview
        assert "avg_ttft_ms" in overview
        assert "total_providers" in overview
        assert "total_samples" in overview

    def test_model_overview_with_bucket(self, client):
        """带 input_length_bucket 筛选。"""
        resp = client.get("/v1/model/gpt-4/overview?input_length_bucket=short")
        assert resp.status_code == 200

    def test_model_overview_not_found(self, client):
        """查询不存在的模型应返回 200 但 overview 可能为空或有零值。"""
        resp = client.get("/v1/model/nonexistent-model/overview")
        assert resp.status_code == 200


class TestModelEntries:
    def test_model_entries_default(self, client):
        """默认参数查询模型条目。"""
        resp = client.get("/v1/model/gpt-4/entries")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "available_filters" in data
        if data["items"]:
            item = data["items"][0]
            assert "provider" in item
            assert "avg_tps" in item

    def test_model_entries_sort_asc(self, client):
        """升序排序生效。"""
        resp = client.get("/v1/model/gpt-4/entries?sort_by=tps&sort_order=asc")
        assert resp.status_code == 200
        data = resp.json()
        items = data["items"]
        if len(items) > 1:
            assert items[0]["avg_tps"] <= items[1]["avg_tps"]

    def test_model_entries_filter_provider(self, client):
        """按 provider 筛选。"""
        resp = client.get("/v1/model/gpt-4/entries?provider=openai")
        assert resp.status_code == 200
        data = resp.json()
        for item in data["items"]:
            assert item["provider"] == "openai"


class TestModelProviderComparison:
    def test_model_provider_comparison(self, client):
        """查询厂商对比数据。"""
        resp = client.get("/v1/model/gpt-4/provider-comparison")
        assert resp.status_code == 200
        data = resp.json()
        assert "model" in data
        assert "data" in data

    def test_model_overview_invalid_bucket(self, client):
        """非法 input_length_bucket 返回 422。"""
        resp = client.get("/v1/model/gpt-4/overview?input_length_bucket=invalid")
        assert resp.status_code == 422

    def test_model_entries_invalid_sort_by(self, client):
        """非法 sort_by 返回 422。"""
        resp = client.get("/v1/model/gpt-4/entries?sort_by=invalid")
        assert resp.status_code == 422
