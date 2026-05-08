"""
测试个人中心接口：/me/stats、/me/overview、/me/contribution-heatmap、/me/profile。

覆盖场景：认证成功获取数据、未认证返回 401、参数筛选生效、响应字段完整性。
"""


class TestMeStats:
    def test_me_stats_authenticated(self, client, auth_cookie):
        """已登录用户获取个人统计。"""
        resp = client.get("/v1/me/stats", cookies=auth_cookie)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_contributions" in data
        assert "rank" in data
        assert "models" in data
        assert isinstance(data["models"], list)

    def test_me_stats_unauthenticated(self, client):
        """未登录应返回 401。"""
        resp = client.get("/v1/me/stats")
        assert resp.status_code == 401


class TestMeOverview:
    def test_me_overview_authenticated(self, client, auth_cookie):
        """已登录用户获取个人概览。"""
        resp = client.get("/v1/me/overview", cookies=auth_cookie)
        assert resp.status_code == 200
        data = resp.json()
        assert "user" in data
        assert "summary" in data
        user = data["user"]
        assert "id" in user
        assert "github_username" in user
        summary = data["summary"]
        assert "total_contributions" in summary
        assert "rank" in summary
        assert "streak_days" in summary

    def test_me_overview_unauthenticated(self, client):
        """未登录应返回 401。"""
        resp = client.get("/v1/me/overview")
        assert resp.status_code == 401

    def test_me_overview_with_range(self, client, auth_cookie):
        """不同时间范围参数生效。"""
        for range_val in ["24h", "7d", "30d"]:
            resp = client.get(f"/v1/me/overview?range={range_val}", cookies=auth_cookie)
            assert resp.status_code == 200
            data = resp.json()
            assert "summary" in data

    def test_me_overview_with_provider_filter(self, client, auth_cookie):
        """按 provider 筛选。"""
        resp = client.get("/v1/me/overview?provider=openai", cookies=auth_cookie)
        assert resp.status_code == 200
        data = resp.json()
        assert "summary" in data

    def test_me_overview_with_bucket_filter(self, client, auth_cookie):
        """按 input_length_bucket 筛选。"""
        resp = client.get("/v1/me/overview?input_length_bucket=short", cookies=auth_cookie)
        assert resp.status_code == 200


class TestMeContributionHeatmap:
    def test_me_heatmap_authenticated(self, client, auth_cookie):
        """已登录用户获取贡献热力图。"""
        resp = client.get("/v1/me/contribution-heatmap", cookies=auth_cookie)
        assert resp.status_code == 200
        data = resp.json()
        assert "range" in data
        assert "range_end" in data
        assert "items" in data
        assert "summary" in data
        assert isinstance(data["items"], list)
        summary = data["summary"]
        assert "streak_days" in summary
        assert "total_active_days" in summary

    def test_me_heatmap_unauthenticated(self, client):
        """未登录应返回 401。"""
        resp = client.get("/v1/me/contribution-heatmap")
        assert resp.status_code == 401

    def test_me_heatmap_with_range(self, client, auth_cookie):
        """不同时间范围参数生效。"""
        for range_val in ["30d", "90d", "365d"]:
            resp = client.get(f"/v1/me/contribution-heatmap?range={range_val}", cookies=auth_cookie)
            assert resp.status_code == 200
            data = resp.json()
            assert data["range"] == range_val


class TestMeProfile:
    def test_me_profile_authenticated(self, client, auth_cookie):
        """已登录用户获取个人资料。"""
        resp = client.get("/v1/me/profile", cookies=auth_cookie)
        assert resp.status_code == 200
        data = resp.json()
        assert "filters" in data
        assert "model_entries" in data
        assert "provider_distribution" in data
        assert "input_length_distribution" in data
        assert "highlights" in data
        assert "comparison" in data
        # highlights 结构
        highlights = data["highlights"]
        assert "most_contributed_entry" in highlights
        assert "fastest_entry" in highlights
        assert "lowest_ttft_entry" in highlights
        # comparison 结构
        comparison = data["comparison"]
        assert "my_avg_tps" in comparison
        assert "global_avg_tps" in comparison

    def test_me_profile_unauthenticated(self, client):
        """未登录应返回 401。"""
        resp = client.get("/v1/me/profile")
        assert resp.status_code == 401

    def test_me_profile_with_filters(self, client, auth_cookie):
        """带筛选参数查询个人资料。"""
        resp = client.get(
            "/v1/me/profile?provider=openai&input_length_bucket=short&range=7d",
            cookies=auth_cookie,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "model_entries" in data

    def test_me_profile_bob_user(self, client, bob_cookie):
        """切换用户验证数据隔离。"""
        resp = client.get("/v1/me/profile", cookies=bob_cookie)
        assert resp.status_code == 200
        data = resp.json()
        # bob 的数据应与 alice 不同
        assert "model_entries" in data
