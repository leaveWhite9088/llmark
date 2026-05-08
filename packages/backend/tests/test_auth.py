"""
测试认证接口：/auth/me、/auth/logout。

覆盖场景：已登录用户获取信息、登出清除 Cookie、未登录访问受保护接口。
注意：/auth/github 和 /auth/github/callback 涉及外部 OAuth 服务，
      不在此处做端到端测试，仅验证路由存在和配置检查。
"""


class TestAuthMe:
    def test_auth_me_success(self, client, auth_cookie):
        """携带有效 Cookie 获取当前用户信息。"""
        resp = client.get("/v1/auth/me", cookies=auth_cookie)
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "github_username" in data
        assert data["github_username"] == "alice"

    def test_auth_me_no_cookie(self, client):
        """未携带 Cookie 应返回 401。"""
        resp = client.get("/v1/auth/me")
        assert resp.status_code == 401

    def test_auth_me_invalid_cookie(self, client):
        """携带无效 Cookie 应返回 401。"""
        resp = client.get("/v1/auth/me", cookies={"llmark_session": "invalid_token"})
        assert resp.status_code == 401


class TestAuthBearer:
    def test_auth_me_with_bearer_token(self, client, auth_cookie):
        """使用 Authorization: Bearer <token> 头也能认证成功。"""
        from utils.jwt import create_token

        alice_id = client._test_user_ids["alice"]
        token = create_token(alice_id)
        resp = client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["github_username"] == "alice"

    def test_auth_me_with_invalid_bearer_token(self, client):
        """使用无效 Bearer Token 应返回 401。"""
        resp = client.get("/v1/auth/me", headers={"Authorization": "Bearer invalid_token"})
        assert resp.status_code == 401

    def test_auth_me_bearer_without_prefix(self, client):
        """Authorization 头缺少 Bearer 前缀应返回 401。"""
        resp = client.get("/v1/auth/me", headers={"Authorization": "some-token"})
        assert resp.status_code == 401


class TestAuthLogout:
    def test_auth_logout(self, client, auth_cookie):
        """登出接口返回成功，并清除 session Cookie。"""
        resp = client.post("/v1/auth/logout", cookies=auth_cookie)
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        # 验证 Set-Cookie 头中包含了删除指令
        set_cookie = resp.headers.get("set-cookie", "")
        assert "expires" in set_cookie.lower() or "max-age=0" in set_cookie.lower()


class TestAuthOAuth:
    def test_github_login_redirect(self, client):
        """
        /auth/github 在 OAuth 未配置时应返回 503（由 require_github_oauth 依赖控制）。
        在测试环境中，settings.github_client_id 为空，因此预期 503。
        """
        from config import settings

        settings.github_client_id = ""
        settings.github_client_secret = ""
        resp = client.get("/v1/auth/github", follow_redirects=False)
        assert resp.status_code == 503

    def test_github_callback_invalid_state(self, client):
        """/auth/github/callback 在 OAuth 未配置时返回 503。"""
        resp = client.get("/v1/auth/github/callback?code=abc&state=xyz")
        assert resp.status_code == 503

    def test_logout_without_cookie(self, client):
        """未登录用户调用 logout 也应返回成功（无副作用）。"""
        resp = client.post("/v1/auth/logout")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
