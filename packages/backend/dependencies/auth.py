from fastapi import Cookie, Header, HTTPException

from config import settings
from utils.jwt import verify_token


async def get_current_user_id(
    authorization: str | None = Header(default=None),
    session_token: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> int:
    token: str | None = None

    if authorization:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid token")
        token = authorization.removeprefix("Bearer ").strip()
    elif session_token:
        token = session_token

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    user_id = verify_token(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id


async def get_optional_user_id(
    authorization: str | None = Header(default=None),
    session_token: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> int | None:
    token: str | None = None

    if authorization:
        if not authorization.startswith("Bearer "):
            return None
        token = authorization.removeprefix("Bearer ").strip()
    elif session_token:
        token = session_token

    if not token:
        return None

    return verify_token(token)


__all__ = ["get_current_user_id", "get_optional_user_id"]
