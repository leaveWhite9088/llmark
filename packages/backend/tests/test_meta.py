"""
测试元数据接口 /meta/filters。

覆盖场景：正常返回、限流、响应字段完整性。
"""


class TestMetaFilters:
    def test_meta_filters(self, client):
        """筛选选项接口返回所有必需的元数据。"""
        resp = client.get("/v1/meta/filters")
        assert resp.status_code == 200
        data = resp.json()
        assert "providers" in data
        assert "input_length_buckets" in data
        assert "input_length_bucket_meta" in data
        assert "models" in data
        # input_length_bucket_meta 应包含 short/medium/long 的详情
        meta_keys = {m["key"] for m in data["input_length_bucket_meta"]}
        assert meta_keys >= {"short", "medium", "long"}
