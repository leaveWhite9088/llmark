"""
测试目录接口：/models、/models/{model}/providers、/providers。

覆盖场景：列表查询、参数校验、响应模型字段完整性。
"""


class TestModelsCatalog:
    def test_models_catalog_default(self, client):
        """默认参数查询模型目录，返回包含 items 和 total 的结构。"""
        resp = client.get("/v1/models")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] > 0
        # 验证 item 字段
        item = data["items"][0]
        assert "model" in item
        assert "provider_count" in item
        assert "avg_tps" in item

    def test_models_catalog_with_range(self, client):
        """带 range 参数查询，验证不同时间范围返回数据。"""
        for range_val in ["24h", "7d", "30d"]:
            resp = client.get(f"/v1/models?range={range_val}")
            assert resp.status_code == 200
            data = resp.json()
            assert data["total"] >= 0

    def test_models_catalog_invalid_range(self, client):
        """非法 range 参数应返回 422。"""
        resp = client.get("/v1/models?range=invalid")
        assert resp.status_code == 422

    def test_models_catalog_with_input_length_bucket(self, client):
        """按 input_length_bucket 筛选。"""
        resp = client.get("/v1/models?input_length_bucket=short")
        assert resp.status_code == 200


class TestModelProvidersCatalog:
    def test_model_providers_catalog(self, client):
        """查询某个模型下的厂商列表。"""
        resp = client.get("/v1/models/gpt-4/providers")
        assert resp.status_code == 200
        data = resp.json()
        assert "model" in data
        assert "providers" in data
        assert len(data["providers"]) > 0


class TestProvidersCatalog:
    def test_providers_catalog_default(self, client):
        """默认参数查询厂商目录。"""
        resp = client.get("/v1/providers")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] > 0

    def test_providers_catalog_sort_by_name(self, client):
        """按 name 排序。"""
        resp = client.get("/v1/providers?sort_by=name&sort_order=asc")
        assert resp.status_code == 200
        data = resp.json()
        items = data["items"]
        if len(items) > 1:
            assert items[0]["name"] <= items[1]["name"]

    def test_providers_catalog_sort_desc(self, client):
        """按 name 降序排序。"""
        resp = client.get("/v1/providers?sort_by=name&sort_order=desc")
        assert resp.status_code == 200
        data = resp.json()
        items = data["items"]
        if len(items) > 1:
            assert items[0]["name"] >= items[1]["name"]


class TestModelsCatalogSorting:
    def test_models_catalog_sort_by_tps(self, client):
        """按 tps 降序排序。"""
        resp = client.get("/v1/models?sort_by=tps&sort_order=desc")
        assert resp.status_code == 200
        data = resp.json()
        items = data["items"]
        if len(items) > 1:
            assert items[0]["avg_tps"] >= items[1]["avg_tps"]

    def test_models_catalog_sort_by_sample_count(self, client):
        """按 sample_count 排序。"""
        resp = client.get("/v1/models?sort_by=sample_count&sort_order=desc")
        assert resp.status_code == 200
        data = resp.json()
        items = data["items"]
        if len(items) > 1:
            assert items[0]["total_samples"] >= items[1]["total_samples"]

    def test_models_catalog_sort_by_name_asc(self, client):
        """按 name 升序排序。"""
        resp = client.get("/v1/models?sort_by=name&sort_order=asc")
        assert resp.status_code == 200
        data = resp.json()
        items = data["items"]
        if len(items) > 1:
            assert items[0]["model"] <= items[1]["model"]


class TestProvidersCatalogSorting:
    def test_providers_catalog_sort_by_tps(self, client):
        """按 tps 降序排序厂商。"""
        resp = client.get("/v1/providers?sort_by=tps&sort_order=desc")
        assert resp.status_code == 200
        data = resp.json()
        items = data["items"]
        if len(items) > 1:
            assert items[0]["avg_tps"] >= items[1]["avg_tps"]

    def test_providers_catalog_sort_by_model_count(self, client):
        """按 model_count 降序排序厂商。"""
        resp = client.get("/v1/providers?sort_by=model_count&sort_order=desc")
        assert resp.status_code == 200
        data = resp.json()
        items = data["items"]
        if len(items) > 1:
            assert items[0]["model_count"] >= items[1]["model_count"]


class TestModelProvidersCatalogEdgeCases:
    def test_model_providers_catalog_not_found(self, client):
        """查询不存在的模型下的厂商列表应返回空。"""
        resp = client.get("/v1/models/nonexistent-model/providers")
        assert resp.status_code == 200
        data = resp.json()
        assert data["providers"] == []
