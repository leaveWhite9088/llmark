import secrets
import urllib.parse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse

from config import settings
from constants import GITHUB_AUTH_URL, GITHUB_EMAILS_URL, GITHUB_TOKEN_URL, GITHUB_USER_URL
from db.connection import get_db
from db.queries import bind_device_to_user, get_user_by_id, upsert_user
from dependencies.auth import get_current_user_id
from schemas import OkResponse
from utils.jwt import create_token


router = APIRouter(tags=["auth"])

GITHUB_STATE_COOKIE = "oauth_state"
DEVICE_ID_COOKIE = "llmark_device_id"
SDK_REDIRECT_COOKIE = "llmark_sdk_redirect"
SDK_DEVICE_COOKIE = "llmark_sdk_device"


def _github_oauth_configured() -> bool:
    return bool(settings.github_client_id and settings.github_client_secret)


async def require_github_oauth() -> None:
    if not _github_oauth_configured():
        raise HTTPException(status_code=503, detail="GitHub OAuth is not configured on the backend")


def _frontend_auth_callback_url(error: str | None = None) -> str:
    query = {}
    if error:
        query["error"] = error
    encoded = urllib.parse.urlencode(query)
    base = f"{settings.frontend_url}/auth/callback"
    return f"{base}?{encoded}" if encoded else base


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        max_age=settings.jwt_expire_days * 24 * 60 * 60,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
    )


async def _exchange_code_for_token(
    client: httpx.AsyncClient,
    code: str,
    redirect_uri: str,
    state: str,
) -> str:
    token_resp = await client.post(
        GITHUB_TOKEN_URL,
        data={
            "client_id": settings.github_client_id,
            "client_secret": settings.github_client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
            "state": state,
        },
        headers={"Accept": "application/json"},
    )
    token_resp.raise_for_status()
    token_payload = token_resp.json()
    access_token = token_payload.get("access_token")
    if not access_token:
        raise HTTPException(status_code=502, detail="GitHub token exchange failed")
    return access_token


async def _fetch_github_user(client: httpx.AsyncClient, access_token: str) -> dict:
    user_resp = await client.get(
        GITHUB_USER_URL,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        },
    )
    user_resp.raise_for_status()
    return user_resp.json()


async def _fetch_primary_email(client: httpx.AsyncClient, access_token: str) -> str | None:
    try:
        emails_resp = await client.get(
            GITHUB_EMAILS_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
        )
        if emails_resp.status_code < 400:
            email_items = emails_resp.json()
            return next(
                (item["email"] for item in email_items if item.get("primary")),
                None,
            )
    except httpx.HTTPError:
        pass
    return None


@router.get("/auth/github", dependencies=[Depends(require_github_oauth)])
async def github_login(request: Request):

    state = secrets.token_urlsafe(24)
    redirect_uri = str(request.url_for("github_callback"))
    query = urllib.parse.urlencode(
        {
            "client_id": settings.github_client_id,
            "scope": "read:user user:email",
            "redirect_uri": redirect_uri,
            "state": state,
        }
    )
    response = RedirectResponse(f"{GITHUB_AUTH_URL}?{query}")
    response.set_cookie(
        key=GITHUB_STATE_COOKIE,
        value=state,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=600,
        path="/",
    )
    return response


@router.get("/auth/github/callback", dependencies=[Depends(require_github_oauth)])
async def github_callback(
    request: Request,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db=Depends(get_db),
):

    if error:
        response = RedirectResponse(_frontend_auth_callback_url(error=error))
        response.delete_cookie(GITHUB_STATE_COOKIE, path="/")
        return response

    cookie_state = request.cookies.get(GITHUB_STATE_COOKIE)
    if not state or not cookie_state or state != cookie_state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    if not code:
        raise HTTPException(status_code=400, detail="Missing GitHub OAuth code")

    redirect_uri = str(request.url_for("github_callback"))

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            access_token = await _exchange_code_for_token(client, code, redirect_uri, state)
            github_user = await _fetch_github_user(client, access_token)

            email = github_user.get("email")
            if not email:
                email = await _fetch_primary_email(client, access_token)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"GitHub OAuth request failed: {exc}") from exc

    user_id = await upsert_user(
        db,
        {
            "github_id": str(github_user["id"]),
            "github_username": github_user.get("login"),
            "github_avatar_url": github_user.get("avatar_url"),
            "email": email,
        },
    )

    device_id = request.cookies.get(DEVICE_ID_COOKIE)
    if device_id:
        await bind_device_to_user(db, device_id, user_id)

    session_token = create_token(user_id)

    # SDK 流程：重定向到 SDK 的 redirect_uri
    sdk_redirect = request.cookies.get(SDK_REDIRECT_COOKIE)
    sdk_device_id = request.cookies.get(SDK_DEVICE_COOKIE)
    if sdk_redirect:
        if sdk_device_id:
            await bind_device_to_user(db, sdk_device_id, user_id)
        params = urllib.parse.urlencode({"token": session_token})
        response = RedirectResponse(f"{sdk_redirect}?{params}")
        _set_session_cookie(response, session_token)
        response.delete_cookie(GITHUB_STATE_COOKIE, path="/")
        response.delete_cookie(DEVICE_ID_COOKIE, path="/")
        response.delete_cookie(SDK_REDIRECT_COOKIE, path="/")
        response.delete_cookie(SDK_DEVICE_COOKIE, path="/")
        return response

    response = RedirectResponse(_frontend_auth_callback_url())
    _set_session_cookie(response, session_token)
    response.delete_cookie(GITHUB_STATE_COOKIE, path="/")
    response.delete_cookie(DEVICE_ID_COOKIE, path="/")
    return response


@router.get("/auth/me")
async def auth_me(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/auth/sdk-token")
async def get_sdk_token(
    request: Request,
    redirect_uri: str | None = Query(default=None),
    device_id: str | None = Query(default=None),
):
    # 检查用户是否已登录（通过 session cookie 或 Authorization header）
    user_id = None
    token = None
    try:
        user_id = await get_current_user_id(
            authorization=request.headers.get("authorization"),
            session_token=request.cookies.get(settings.session_cookie_name),
        )
    except HTTPException:
        pass

    if user_id is not None:
        token = create_token(user_id)
        if device_id:
            async for db in get_db():
                await bind_device_to_user(db, device_id, user_id)
                break

    # 无 redirect_uri：返回 JSON（兼容现有行为）
    if not redirect_uri:
        if token:
            return {"token": token}
        raise HTTPException(status_code=401, detail="Authentication required")

    # 有 redirect_uri：重定向
    if token:
        params = urllib.parse.urlencode({"token": token})
        return RedirectResponse(f"{redirect_uri}?{params}")

    # 用户未登录：跳转 GitHub OAuth，完成后重定向到 SDK
    if not _github_oauth_configured():
        raise HTTPException(status_code=503, detail="GitHub OAuth is not configured")

    state = secrets.token_urlsafe(24)
    github_redirect_uri = str(request.url_for("github_callback"))
    query = urllib.parse.urlencode({
        "client_id": settings.github_client_id,
        "scope": "read:user user:email",
        "redirect_uri": github_redirect_uri,
        "state": state,
    })
    response = RedirectResponse(f"{GITHUB_AUTH_URL}?{query}")
    response.set_cookie(
        key=GITHUB_STATE_COOKIE,
        value=state,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=600,
        path="/",
    )
    response.set_cookie(
        key=SDK_REDIRECT_COOKIE,
        value=redirect_uri,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=600,
        path="/",
    )
    if device_id:
        response.set_cookie(
            key=SDK_DEVICE_COOKIE,
            value=device_id,
            httponly=True,
            secure=settings.session_cookie_secure,
            samesite="lax",
            max_age=600,
            path="/",
        )
    return response


@router.post("/auth/logout", response_model=OkResponse)
async def logout(response: Response):
    _clear_session_cookie(response)
    return OkResponse()
