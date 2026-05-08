from typing import Any

from constants import PROVIDER_DISPLAY_NAMES
from db.adapter import DatabaseAdapter


async def upsert_user(db, payload: dict[str, Any]) -> int:
    adapter = DatabaseAdapter(db)
    avatar_url = payload.get("github_avatar_url")
    return await adapter.insert(
        """
        INSERT INTO users (github_id, github_username, github_avatar_url, email)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (github_id) DO UPDATE
        SET github_username = EXCLUDED.github_username,
            github_avatar_url = EXCLUDED.github_avatar_url,
            email = EXCLUDED.email
        RETURNING id
        """,
        payload["github_id"],
        payload["github_username"],
        avatar_url,
        payload["email"],
    )


async def get_user_by_id(db, user_id: int) -> dict[str, Any] | None:
    adapter = DatabaseAdapter(db)
    row = await adapter.fetchrow(
        "SELECT id, github_id, github_username, github_avatar_url, email, created_at FROM users WHERE id = $1",
        user_id,
    )

    if row and not row.get("github_avatar_url") and row.get("github_id"):
        row = dict(row)
        row["github_avatar_url"] = _avatar_url_for_github_id(str(row["github_id"]))

    return row


def _contribution_level(total_contributions: int) -> str:
    """
    统一的贡献者等级系统（6级）
    与前端 LevelInfoModal 保持一致
    """
    if total_contributions >= 1000:
        return "legend"  # 传奇
    if total_contributions >= 500:
        return "expert"  # 专家
    if total_contributions >= 200:
        return "advanced"  # 高级
    if total_contributions >= 50:
        return "intermediate"  # 进阶者
    if total_contributions >= 10:
        return "beginner"  # 初学者
    return "observer"  # 观察者


def _avatar_url_for_github_id(github_id: str | None) -> str | None:
    if not github_id:
        return None
    return f"https://avatars.githubusercontent.com/u/{github_id}?v=4"


__all__ = [
    "get_user_by_id",
    "upsert_user",
    "_avatar_url_for_github_id",
    "_contribution_level",
]
