import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from .badge import _build_badges_from_rows
from db.adapter import DatabaseAdapter
from db.cache import cache_get, cache_set

from .helpers import (
    _compute_streak_days_from_dates,
    _parse_dt,
    sort_items,
)
from .snapshot import ensure_daily_user_rank_snapshots
from .users_base import _avatar_url_for_github_id, _contribution_level


def _sort_users_leaderboard_items(
    items: list[dict[str, Any]], sort_by: str, sort_order: str
) -> list[dict[str, Any]]:
    if sort_by == "tps" and sort_order == "desc":
        items.sort(key=lambda item: (-item["avg_tps"], item["avg_ttft_ms"], item["user_id"]))
        return items
    if sort_by == "tps":
        items.sort(key=lambda item: (item["avg_tps"], item["avg_ttft_ms"], item["user_id"]))
        return items
    sort_items(
        items,
        sort_by,
        sort_order,
        {
            "models": lambda item: (item["models_tested"], item["total_contributions"], item["user_id"]),
            "ttft": lambda item: (item["avg_ttft_ms"], item["avg_tps"], item["user_id"]),
            "rank": lambda item: item["rank"],
        },
        default_key=lambda item: (item["total_contributions"], item["models_tested"], item["user_id"]),
    )
    return items


async def _fetch_all_user_report_rows(db) -> list[dict[str, Any]]:
    adapter = DatabaseAdapter(db)
    return await adapter.fetch(
        """
        SELECT user_id, model, provider, input_length_bucket, created_at
        FROM reports
        WHERE user_id IS NOT NULL
        ORDER BY created_at ASC
        """
    )


async def _fetch_user_aggregate_rows(db) -> list[dict[str, Any]]:
    adapter = DatabaseAdapter(db)
    sql = """
        SELECT
            r.user_id,
            u.github_id,
            u.github_username,
            COUNT(*) AS total_contributions,
            COUNT(DISTINCT r.model) AS models_tested,
            AVG(r.tps) AS avg_tps,
            AVG(r.ttft_ms) AS avg_ttft_ms
        FROM reports r
        JOIN users u ON u.id = r.user_id
        WHERE r.user_id IS NOT NULL
        GROUP BY r.user_id, u.github_id, u.github_username
    """
    return await adapter.fetch(sql)


async def _fetch_snapshot_rank_changes(db) -> dict[int, int]:
    adapter = DatabaseAdapter(db)
    rows = await adapter.fetch(
        "SELECT DISTINCT snapshot_date FROM user_rank_snapshots ORDER BY snapshot_date DESC LIMIT 2"
    )
    dates = [row["snapshot_date"] for row in rows]
    if len(dates) < 2:
        return {}

    current_rows = await adapter.fetch(
        "SELECT user_id, rank FROM user_rank_snapshots WHERE snapshot_date = $1",
        dates[0],
    )
    previous_rows = await adapter.fetch(
        "SELECT user_id, rank FROM user_rank_snapshots WHERE snapshot_date = $1",
        dates[1],
    )
    current_map = {int(row["user_id"]): int(row["rank"]) for row in current_rows}
    previous_map = {int(row["user_id"]): int(row["rank"]) for row in previous_rows}
    return {
        user_id: previous_map.get(user_id, current_rank) - current_rank
        for user_id, current_rank in current_map.items()
    }


def _group_report_rows_by_user(
    report_rows: list[dict[str, Any]],
) -> dict[int, list[dict[str, Any]]]:
    result: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for row in report_rows:
        user_id = int(row.get("user_id") or 0)
        if user_id:
            result[user_id].append(row)
    return result


def _sort_canonical_rows(aggregate_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        aggregate_rows,
        key=lambda row: (-int(row["total_contributions"] or 0), int(row["user_id"])),
    )


def _build_rank_map(canonical_rows: list[dict[str, Any]]) -> dict[int, int]:
    return {int(row["user_id"]): index for index, row in enumerate(canonical_rows, start=1)}


def _build_leaderboard_user_entries(
    canonical_rows: list[dict[str, Any]],
    report_rows_by_user: dict[int, list[dict[str, Any]]],
    rank_map: dict[int, int],
    rank_changes: dict[int, int],
    week_cutoff: datetime,
) -> tuple[list[dict[str, Any]], dict[int, int]]:
    users: list[dict[str, Any]] = []
    weekly_counts: dict[int, int] = defaultdict(int)
    for row in canonical_rows:
        user_id = int(row["user_id"])
        user_reports = report_rows_by_user.get(user_id, [])
        for report_row in user_reports:
            created_at = _parse_dt(report_row["created_at"])
            if created_at >= week_cutoff:
                weekly_counts[user_id] += 1
        streak_days = _compute_streak_days_from_dates(
            [_parse_dt(item["created_at"]).date() for item in user_reports]
        )
        badges = _build_badges_from_rows(user_reports)
        total_contributions = int(row["total_contributions"] or 0)
        github_id = str(row["github_id"]) if row.get("github_id") else None
        username = str(row.get("github_username") or f"user-{user_id}")
        level = _contribution_level(total_contributions)
        last_active_at = None
        if user_reports:
            last_active_dt = max(_parse_dt(item["created_at"]) for item in user_reports)
            last_active_at = last_active_dt.isoformat()
        users.append(
            {
                "rank": rank_map[user_id],
                "user_id": user_id,
                "username": username,
                "avatar_url": _avatar_url_for_github_id(github_id),
                "total_contributions": total_contributions,
                "models_tested": int(row["models_tested"] or 0),
                "avg_tps": round(float(row["avg_tps"] or 0.0), 2),
                "avg_ttft_ms": int(round(float(row["avg_ttft_ms"] or 0.0))),
                "contribution_level": level,
                "rank_change": int(rank_changes.get(user_id, 0)),
                "badges": [badge["id"] for badge in badges],
                "streak_days": streak_days,
                "last_active_at": last_active_at,
            }
        )
    return users, weekly_counts


def _paginate_users(
    users: list[dict[str, Any]],
    page: int,
    page_size: int,
    sort_by: str,
    sort_order: str,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    sorted_users = _sort_users_leaderboard_items(users, sort_by, sort_order)
    total_users = len(sorted_users)
    total_pages = max(math.ceil(total_users / page_size), 1) if page_size else 1
    safe_page = min(page, total_pages)
    start = (safe_page - 1) * page_size
    paged_users = sorted_users[start : start + page_size]
    pagination = {
        "page": safe_page,
        "page_size": page_size,
        "total": total_users,
        "total_pages": total_pages,
    }
    return pagination, paged_users


def _compute_leaderboard_stats(
    report_rows: list[dict[str, Any]],
    users: list[dict[str, Any]],
    today_start: datetime,
    yesterday_start: datetime,
) -> dict[str, Any]:
    total_contributions = sum(item["total_contributions"] for item in users)
    models_covered = len({str(row.get("model") or "") for row in report_rows if row.get("model")})
    contributions_today = sum(1 for row in report_rows if _parse_dt(row["created_at"]) >= today_start)
    contributions_yesterday = sum(1 for row in report_rows if yesterday_start <= _parse_dt(row["created_at"]) < today_start)

    today_users = {str(row.get("user_id")) for row in report_rows if row.get("user_id") and _parse_dt(row["created_at"]) >= today_start}
    yesterday_users = {str(row.get("user_id")) for row in report_rows if row.get("user_id") and yesterday_start <= _parse_dt(row["created_at"]) < today_start}

    today_models = {str(row.get("model") or "") for row in report_rows if row.get("model") and _parse_dt(row["created_at"]) >= today_start}
    yesterday_models = {str(row.get("model") or "") for row in report_rows if row.get("model") and yesterday_start <= _parse_dt(row["created_at"]) < today_start}

    return {
        "total_contributors": len(users),
        "total_contributions": total_contributions,
        "models_covered": models_covered,
        "contributions_today": contributions_today,
        "contributors_trend": len(today_users) - len(yesterday_users) if today_users or yesterday_users else None,
        "contributions_trend": contributions_today - contributions_yesterday if contributions_today or contributions_yesterday else None,
        "models_trend": len(today_models) - len(yesterday_models) if today_models or yesterday_models else None,
        "today_trend": contributions_today - contributions_yesterday if contributions_today or contributions_yesterday else None,
    }


def _build_leaderboard_highlights(
    users: list[dict[str, Any]],
    weekly_counts: dict[int, int],
) -> dict[str, Any]:
    weekly_star = None
    if weekly_counts:
        star_user_id, star_count = max(weekly_counts.items(), key=lambda item: (item[1], -item[0]))
        star_user = next((item for item in users if item["user_id"] == star_user_id), None)
        if star_user:
            weekly_star = {
                "user_id": star_user_id,
                "username": star_user["username"],
                "contributions_7d": star_count,
            }

    fastest_riser = None
    positive_changes = [item for item in users if item["rank_change"] > 0]
    if positive_changes:
        rising_user = max(
            positive_changes,
            key=lambda item: (item["rank_change"], item["total_contributions"], -item["user_id"]),
        )
        fastest_riser = {
            "user_id": rising_user["user_id"],
            "username": rising_user["username"],
            "rank_change": rising_user["rank_change"],
        }

    top_tps = None
    if users:
        tps_user = max(users, key=lambda item: (item["avg_tps"], -item["avg_ttft_ms"], -item["user_id"]))
        top_tps = {
            "user_id": tps_user["user_id"],
            "username": tps_user["username"],
            "avg_tps": tps_user["avg_tps"],
        }

    return {
        "weekly_star": weekly_star,
        "fastest_riser": fastest_riser,
        "top_tps": top_tps,
    }


def _build_level_distribution(users: list[dict[str, Any]]) -> list[dict[str, Any]]:
    total_users = len(users)
    if not total_users:
        return []
    level_counts: dict[str, int] = defaultdict(int)
    for item in users:
        level_counts[item["contribution_level"]] += 1
    distribution = []
    for level, count in level_counts.items():
        percentage = round((count * 100.0 / total_users), 1)
        distribution.append({"level": level, "count": count, "percentage": percentage})
    distribution.sort(key=lambda item: (-item["count"], item["level"]))
    return distribution


async def get_users_leaderboard(
    db,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "contributions",
    sort_order: str = "desc",
    current_user_id: int | None = None,
) -> dict[str, Any]:
    cached = await cache_get(
        "users_leaderboard",
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    if cached is not None:
        return cached

    await ensure_daily_user_rank_snapshots(db)
    aggregate_rows = await _fetch_user_aggregate_rows(db)
    report_rows = await _fetch_all_user_report_rows(db)
    rank_changes = await _fetch_snapshot_rank_changes(db)

    report_rows_by_user = _group_report_rows_by_user(report_rows)
    canonical_rows = _sort_canonical_rows(aggregate_rows)
    rank_map = _build_rank_map(canonical_rows)

    now = datetime.now(timezone.utc)
    today_start = datetime.combine(now.date(), datetime.min.time(), tzinfo=timezone.utc)
    yesterday_start = today_start - timedelta(days=1)
    week_cutoff = now - timedelta(days=7)

    users, weekly_counts = _build_leaderboard_user_entries(
        canonical_rows, report_rows_by_user, rank_map, rank_changes, week_cutoff
    )
    pagination, paged_users = _paginate_users(users, page, page_size, sort_by, sort_order)
    stats = _compute_leaderboard_stats(report_rows, users, today_start, yesterday_start)
    highlights = _build_leaderboard_highlights(users, weekly_counts)
    level_distribution = _build_level_distribution(users)

    current_user_rank = rank_map.get(current_user_id) if current_user_id else None

    result = {
        "pagination": pagination,
        "stats": stats,
        "highlights": highlights,
        "level_distribution": level_distribution,
        "users": paged_users,
        "current_user_rank": current_user_rank,
    }
    await cache_set("users_leaderboard", result, page=page, page_size=page_size, sort_by=sort_by, sort_order=sort_order)
    return result


__all__ = [
    "get_users_leaderboard",
]
