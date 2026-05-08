import asyncio
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from db.adapter import DatabaseAdapter
from .helpers import _isoformat_or_none, _parse_dt


USER_BADGE_DEFINITIONS = {
    "first-benchmark": {
        "name": "First Benchmark",
        "description": "Completed the first LLMark benchmark.",
        "icon_svg": "/assets/badges/first-benchmark.svg",
    },
    "fifty-benchmarks": {
        "name": "Fifty Benchmarks",
        "description": "Completed 50 LLMark benchmarks.",
        "icon_svg": "/assets/badges/fifty-benchmarks.svg",
    },
    "model-explorer": {
        "name": "Model Explorer",
        "description": "Benchmarked 5 different models.",
        "icon_svg": "/assets/badges/model-explorer.svg",
    },
    "provider-hopper": {
        "name": "Provider Hopper",
        "description": "Benchmarked 3 different providers.",
        "icon_svg": "/assets/badges/provider-hopper.svg",
    },
    "long-text-runner": {
        "name": "Long Text Runner",
        "description": "Completed 10 long-input benchmarks.",
        "icon_svg": "/assets/badges/long-text-runner.svg",
    },
    "streak-3": {
        "name": "Three-Day Streak",
        "description": "Contributed on 3 consecutive days.",
        "icon_svg": "/assets/badges/streak-3.svg",
    },
}


async def _fetch_user_report_rows(db, user_id: int) -> list[dict[str, Any]]:
    adapter = DatabaseAdapter(db)
    return await adapter.fetch(
        """
        SELECT user_id, model, provider, input_length_bucket, created_at
        FROM reports
        WHERE user_id = $1
        ORDER BY created_at ASC
        """,
        user_id,
    )


def _build_badges_from_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return []

    earned: dict[str, str] = {}
    models_seen: set[str] = set()
    providers_seen: set[str] = set()
    long_count = 0

    for index, row in enumerate(rows, start=1):
        created_at = _isoformat_or_none(row.get("created_at"))
        model = str(row.get("model") or "")
        provider = str(row.get("provider") or "")
        bucket = str(row.get("input_length_bucket") or "")

        if index == 1 and "first-benchmark" not in earned:
            earned["first-benchmark"] = created_at
        if index >= 50 and "fifty-benchmarks" not in earned:
            earned["fifty-benchmarks"] = created_at

        if model:
            models_seen.add(model)
            if len(models_seen) >= 5 and "model-explorer" not in earned:
                earned["model-explorer"] = created_at

        if provider:
            providers_seen.add(provider)
            if len(providers_seen) >= 3 and "provider-hopper" not in earned:
                earned["provider-hopper"] = created_at

        if bucket == "long":
            long_count += 1
            if long_count >= 10 and "long-text-runner" not in earned:
                earned["long-text-runner"] = created_at

    date_values = sorted({_parse_dt(row["created_at"]).date() for row in rows})
    streak = 0
    streak_hit_date: str | None = None
    previous_date: datetime.date | None = None
    for active_date in date_values:
        if previous_date is None or active_date == previous_date + timedelta(days=1):
            streak += 1
        elif active_date > previous_date:
            streak = 1
        previous_date = active_date
        if streak >= 3 and streak_hit_date is None:
            streak_hit_date = (
                datetime.combine(active_date, datetime.min.time(), tzinfo=timezone.utc)
                .isoformat()
                .replace("+00:00", "Z")
            )
    if streak_hit_date:
        earned["streak-3"] = streak_hit_date

    badges: list[dict[str, Any]] = []
    for badge_id, earned_at in earned.items():
        meta = USER_BADGE_DEFINITIONS[badge_id]
        badges.append(
            {
                "id": badge_id,
                "name": meta["name"],
                "description": meta["description"],
                "icon_svg": meta["icon_svg"],
                "earned_at": earned_at,
            }
        )
    badges.sort(key=lambda item: item["earned_at"] or "")
    return badges


async def _fetch_distinct_user_ids(db) -> list[int]:
    adapter = DatabaseAdapter(db)
    rows = await adapter.fetch(
        "SELECT DISTINCT user_id FROM reports WHERE user_id IS NOT NULL ORDER BY user_id"
    )
    return [row["user_id"] for row in rows]


async def _clear_all_badges(db) -> None:
    adapter = DatabaseAdapter(db)
    await adapter.execute("DELETE FROM user_badges")


async def _bulk_insert_badges(db, badge_rows: list[tuple[int, str, str]]) -> None:
    if not badge_rows:
        return
    adapter = DatabaseAdapter(db)
    converted: list[tuple[int, str, datetime | None]] = []
    for user_id, badge_id, earned_at in badge_rows:
        dt = None
        if earned_at:
            dt = datetime.fromisoformat(earned_at.replace("Z", "+00:00"))
        converted.append((user_id, badge_id, dt))
    await adapter.raw.executemany(
        "INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES ($1, $2, $3)",
        converted,
    )


async def refresh_all_user_badges(db) -> None:
    """重新计算所有用户的徽章并写入 user_badges 预计算表。"""
    await _clear_all_badges(db)
    user_ids = await _fetch_distinct_user_ids(db)
    badge_rows: list[tuple[int, str, str]] = []
    for user_id in user_ids:
        rows = await _fetch_user_report_rows(db, user_id)
        badges = _build_badges_from_rows(rows)
        for badge in badges:
            earned_at = badge["earned_at"] or ""
            badge_rows.append((user_id, badge["id"], earned_at))
    await _bulk_insert_badges(db, badge_rows)


async def get_user_badges(db, user_id: int) -> dict[str, Any]:
    adapter = DatabaseAdapter(db)
    rows = await adapter.fetch(
        """
        SELECT badge_id, earned_at
        FROM user_badges
        WHERE user_id = $1
        ORDER BY earned_at ASC
        """,
        user_id,
    )
    badges: list[dict[str, Any]] = []
    for row in rows:
        badge_id = row["badge_id"]
        meta = USER_BADGE_DEFINITIONS.get(badge_id)
        if not meta:
            continue
        badges.append(
            {
                "id": badge_id,
                "name": meta["name"],
                "description": meta["description"],
                "icon_svg": meta["icon_svg"],
                "earned_at": _isoformat_or_none(row.get("earned_at")),
            }
        )
    return {
        "badges": badges,
        "total_count": len(badges),
    }


__all__ = [
    "_build_badges_from_rows",
    "get_user_badges",
    "refresh_all_user_badges",
]
