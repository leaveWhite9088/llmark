"""
测试排行榜接口：/leaderboard、/users/leaderboard、/users/badges。

覆盖场景：默认查询、参数组合、分页、认证接口。
"""


class TestLeaderboard:
    def test_leaderboard_default(self, client):
        """默认参数查询性能排行榜。"""
        resp = client.get("/v1/leaderboard")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        if data:
            item = data[0]
            assert "provider" in item
            assert "model" in item
            assert "avg_tps" in item

    def test_leaderboard_with_filters(self, client):
        """带 provider 和 model 筛选。"""
        resp = client.get("/v1/leaderboard?provider=openai&model=gpt-4")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_leaderboard_invalid_sort_by(self, client):
        """非法 sort_by 返回 422。"""
        resp = client.get("/v1/leaderboard?sort_by=invalid")
        assert resp.status_code == 422


class TestUsersLeaderboard:
    def test_users_leaderboard_default(self, client):
        """默认参数查询用户排行榜。"""
        resp = client.get("/v1/users/leaderboard")
        assert resp.status_code == 200
        data = resp.json()
        assert "users" in data
        assert "pagination" in data
        assert data["pagination"]["total"] > 0

    def test_users_leaderboard_pagination(self, client):
        """分页参数生效。"""
        resp = client.get("/v1/users/leaderboard?page=1&page_size=2")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["users"]) <= 2

    def test_users_leaderboard_sort(self, client):
        """按 contributions 排序。"""
        resp = client.get("/v1/users/leaderboard?sort_by=contributions&sort_order=desc")
        assert resp.status_code == 200
        data = resp.json()
        users = data["users"]
        if len(users) > 1:
            assert users[0]["total_contributions"] >= users[1]["total_contributions"]

    def test_users_leaderboard_with_bucket(self, client):
        """按 input_length_bucket 筛选用户排行榜。"""
        resp = client.get("/v1/users/leaderboard?input_length_bucket=short")
        assert resp.status_code == 200
        data = resp.json()
        assert "users" in data

    def test_users_leaderboard_invalid_sort_order(self, client):
        """非法 sort_order 返回 422。"""
        resp = client.get("/v1/users/leaderboard?sort_order=invalid")
        assert resp.status_code == 422


class TestUsersBadges:
    def test_users_badges_authenticated(self, client, auth_cookie):
        """已登录用户获取徽章列表。"""
        resp = client.get("/v1/users/badges", cookies=auth_cookie)
        assert resp.status_code == 200
        data = resp.json()
        assert "badges" in data
        assert "total_count" in data
        # alice 有足量数据，应获得一些徽章
        assert data["total_count"] >= 1

    def test_users_badges_unauthenticated(self, client):
        """未登录应返回 401/403。"""
        resp = client.get("/v1/users/badges")
        assert resp.status_code in (401, 403)
