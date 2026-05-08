from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from constants import INPUT_LENGTH_BUCKET_VALUES
from utils.model_names import display_model_name
from .filters import get_provider_display_name
from .helpers import _compute_streak_days_from_dates, _interval_to_delta, _parse_dt, classify_input_length_bucket
from .reports_fetch import fetch_global_rows, fetch_user_rows
from .users_base import _avatar_url_for_github_id, _contribution_level, get_user_by_id


def _compute_rank_snapshot(rows: list[Any], user_id: int) -> dict[str, Any]:
    counts: dict[int, int] = defaultdict(int)
    for row in rows:
        row_user_id = row["user_id"]
        if row_user_id is None:
            continue
        counts[int(row_user_id)] += 1

    if not counts:
        return {
            "rank": 0,
            "users_behind_percentage": 0.0,
            "distance_to_next_rank": 0,
            "total_ranked_users": 0,
        }

    ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    total_users = len(ranked)
    rank = 0
    user_count = counts.get(user_id, 0)
    distance_to_next_rank = 0
    for index, (ranked_user_id, contribution_count) in enumerate(ranked, start=1):
        if ranked_user_id != user_id:
            continue
        rank = index
        if index > 1:
            higher_count = ranked[index - 2][1]
            distance_to_next_rank = max(higher_count - user_count + 1, 0)
        break

    if rank == 0:
        users_behind_percentage = 0.0
    else:
        users_behind_percentage = round(((total_users - rank + 1) / total_users) * 100.0, 1)

    return {
        "rank": rank,
        "users_behind_percentage": users_behind_percentage,
        "distance_to_next_rank": distance_to_next_rank,
        "total_ranked_users": total_users,
    }


def _avatar_url_for_user(user: dict[str, Any] | None) -> str | None:
    if not user:
        return None
    return _avatar_url_for_github_id(user.get("github_id"))


async def get_me_overview(
    db,
    user_id: int,
    interval: str | None,
    range_label: str,
    provider: str | None,
    input_length_bucket: str | None,
) -> dict[str, Any]:
    user = await get_user_by_id(db, user_id)

    # summary 始终使用全部时间的数据，不受时间选择器影响
    user_rows = await fetch_user_rows(db, user_id, None, None, None)
    global_rows = await fetch_global_rows(db, None, None, None)

    total_contributions = len(user_rows)
    tested_models_count = len({str(row["model"]) for row in user_rows if row["model"]})
    tested_providers_count = len({str(row["provider"]) for row in user_rows if row["provider"]})

    now = datetime.now(timezone.utc)
    week_cutoff = now - timedelta(days=7)
    contributions_last_7d = sum(1 for row in user_rows if _parse_dt(row["created_at"]) >= week_cutoff)

    streak_days = _compute_streak_days_from_dates(
        [_parse_dt(row["created_at"]).date() for row in user_rows]
    )

    rank_snapshot = _compute_rank_snapshot(global_rows, user_id)

    return {
        "user": {
            "id": user["id"] if user else user_id,
            "github_id": user.get("github_id") if user else None,
            "github_username": user.get("github_username") if user else None,
            "email": user.get("email") if user else None,
            "created_at": _parse_dt(user.get("created_at")).isoformat().replace("+00:00", "Z") if user and user.get("created_at") else None,
            "github_avatar_url": _avatar_url_for_user(user),
        },
        "summary": {
            "total_contributions": total_contributions,
            "rank": int(rank_snapshot["rank"]),
            "total_ranked_users": int(rank_snapshot["total_ranked_users"]),
            "tested_models_count": tested_models_count,
            "tested_providers_count": tested_providers_count,
            "contributions_last_7d": contributions_last_7d,
            "streak_days": streak_days,
            "users_behind_percentage": rank_snapshot["users_behind_percentage"],
            "distance_to_next_rank": rank_snapshot["distance_to_next_rank"],
            "contribution_level": _contribution_level(total_contributions),
        },
    }


async def get_me_contribution_heatmap(db, user_id: int, interval: str | None, range_label: str) -> dict[str, Any]:
    user_rows = await fetch_user_rows(db, user_id, interval, None)
    date_counts: dict[str, int] = defaultdict(int)
    for row in user_rows:
        day = _parse_dt(row["created_at"]).date()
        date_counts[day.isoformat()] += 1
    streak_days = _compute_streak_days_from_dates(
        [datetime.fromisoformat(day).date() for day in date_counts.keys()]
    )

    best_day = None
    if date_counts:
        best_day_date, best_day_count = max(date_counts.items(), key=lambda item: (item[1], item[0]))
        best_day = {"date": best_day_date, "count": best_day_count}

    range_start = None
    if interval:
        range_start = (datetime.now(timezone.utc) - _interval_to_delta(interval)).date().isoformat()

    return {
        "range": range_label,
        "range_start": range_start,
        "range_end": datetime.now(timezone.utc).date().isoformat(),
        "items": [{"date": day, "count": count} for day, count in sorted(date_counts.items())],
        "summary": {
            "streak_days": streak_days,
            "best_day": best_day,
            "total_active_days": len(date_counts),
        },
    }


def _build_global_entry_map(global_rows: list[dict[str, Any]]) -> dict[tuple[str, str, str], dict[str, Any]]:
    global_entry_map: dict[tuple[str, str, str], dict[str, Any]] = {}
    for row in global_rows:
        provider_value = str(row["provider"])
        model_value = str(row["model"])
        bucket_value = row["input_length_bucket"] or classify_input_length_bucket(int(row["prompt_tokens"]))
        key = (provider_value, model_value, bucket_value)
        item = global_entry_map.setdefault(key, {"tps": [], "ttft": []})
        item["tps"].append(float(row["tps"]))
        item["ttft"].append(int(row["ttft_ms"]))
    return global_entry_map


def _aggregate_user_reports(
    user_rows: list[dict[str, Any]],
) -> tuple[
    dict[tuple[str, str, str], dict[str, Any]],
    dict[str, int],
    dict[str, int],
    dict[tuple[str, str, str], dict[str, Any]],
    list[float],
    list[int],
]:
    model_groups: dict[tuple[str, str, str], dict[str, Any]] = {}
    provider_distribution: dict[str, int] = defaultdict(int)
    bucket_distribution: dict[str, int] = defaultdict(int)
    highlight_groups: dict[tuple[str, str, str], dict[str, Any]] = {}
    my_tps_values: list[float] = []
    my_ttft_values: list[int] = []

    for row in user_rows:
        provider_value = str(row["provider"])
        model_value = str(row["model"])
        bucket_value = row["input_length_bucket"] or classify_input_length_bucket(int(row["prompt_tokens"]))
        created_at = _parse_dt(row["created_at"])
        key = (provider_value, model_value, bucket_value)
        entry = model_groups.setdefault(
            key,
            {
                "provider": provider_value,
                "model": model_value,
                "input_length_bucket": bucket_value,
                "tps": [],
                "ttft": [],
                "last_contributed_at": created_at,
            },
        )
        entry["tps"].append(float(row["tps"]))
        entry["ttft"].append(int(row["ttft_ms"]))
        if created_at > entry["last_contributed_at"]:
            entry["last_contributed_at"] = created_at

        provider_distribution[provider_value] += 1
        bucket_distribution[str(bucket_value)] += 1
        my_tps_values.append(float(row["tps"]))
        my_ttft_values.append(int(row["ttft_ms"]))

        highlight_entry = highlight_groups.setdefault(
            key,
            {
                "provider": provider_value,
                "model": model_value,
                "input_length_bucket": bucket_value,
                "tps": [],
                "ttft": [],
                "sample_count": 0,
            },
        )
        highlight_entry["tps"].append(float(row["tps"]))
        highlight_entry["ttft"].append(int(row["ttft_ms"]))
        highlight_entry["sample_count"] += 1

    return model_groups, provider_distribution, bucket_distribution, highlight_groups, my_tps_values, my_ttft_values


def _build_profile_model_entries(
    model_groups: dict[tuple[str, str, str], dict[str, Any]],
    global_entry_map: dict[tuple[str, str, str], dict[str, Any]],
) -> list[dict[str, Any]]:
    model_entries = []
    for key, entry in model_groups.items():
        sample_count = len(entry["tps"])
        global_stats = global_entry_map.get(key, {"tps": [], "ttft": []})
        my_avg_tps = round(sum(entry["tps"]) / sample_count, 2)
        my_avg_ttft_ms = int(round(sum(entry["ttft"]) / sample_count))
        global_avg_tps = round(sum(global_stats["tps"]) / len(global_stats["tps"]), 2) if global_stats["tps"] else 0.0
        global_avg_ttft_ms = int(round(sum(global_stats["ttft"]) / len(global_stats["ttft"]))) if global_stats["ttft"] else 0
        model_entries.append(
            {
                "provider": entry["provider"],
                "provider_name": get_provider_display_name(entry["provider"]),
                "model": display_model_name(entry["model"]),
                "input_length_bucket": entry["input_length_bucket"],
                "my_sample_count": sample_count,
                "my_avg_tps": my_avg_tps,
                "my_avg_ttft_ms": my_avg_ttft_ms,
                "global_avg_tps": global_avg_tps,
                "global_avg_ttft_ms": global_avg_ttft_ms,
                "delta_tps": round(my_avg_tps - global_avg_tps, 2),
                "delta_ttft_ms": my_avg_ttft_ms - global_avg_ttft_ms,
                "last_contributed_at": entry["last_contributed_at"].isoformat(),
            }
        )

    model_entries.sort(key=lambda item: (-item["my_sample_count"], -item["my_avg_tps"], item["provider"], item["model"]))
    return model_entries


def _build_provider_distribution_items(
    provider_distribution: dict[str, int], total_samples: int
) -> list[dict[str, Any]]:
    return [
        {
            "key": key,
            "provider": key,
            "provider_name": get_provider_display_name(key),
            "sample_count": value,
            "percentage": round((value / total_samples) * 100.0, 1) if total_samples else 0.0,
        }
        for key, value in sorted(provider_distribution.items(), key=lambda item: (-item[1], item[0]))
    ]


def _build_input_length_distribution_items(
    bucket_distribution: dict[str, int], total_samples: int
) -> list[dict[str, Any]]:
    def _sort_key(item: tuple[str, int]) -> tuple[int, str]:
        key, _ = item
        return (INPUT_LENGTH_BUCKET_VALUES.index(key) if key in INPUT_LENGTH_BUCKET_VALUES else 99, key)

    return [
        {
            "key": key,
            "input_length_bucket": key,
            "sample_count": value,
            "percentage": round((value / total_samples) * 100.0, 1) if total_samples else 0.0,
        }
        for key, value in sorted(bucket_distribution.items(), key=_sort_key)
    ]


def _build_profile_highlights(
    highlight_groups: dict[tuple[str, str, str], dict[str, Any]]
) -> dict[str, Any]:
    highlight_items = []
    for item in highlight_groups.values():
        sample_count = item["sample_count"]
        highlight_items.append(
            {
                "provider": item["provider"],
                "provider_name": get_provider_display_name(item["provider"]),
                "model": display_model_name(item["model"]),
                "input_length_bucket": item["input_length_bucket"],
                "sample_count": sample_count,
                "avg_tps": round(sum(item["tps"]) / sample_count, 2),
                "avg_ttft_ms": int(round(sum(item["ttft"]) / sample_count)),
            }
        )

    most_contributed_entry = max(highlight_items, key=lambda item: (item["sample_count"], item["avg_tps"])) if highlight_items else None
    fastest_entry = max(highlight_items, key=lambda item: (item["avg_tps"], -item["avg_ttft_ms"], item["sample_count"])) if highlight_items else None
    lowest_ttft_entry = min(highlight_items, key=lambda item: (item["avg_ttft_ms"], -item["avg_tps"], -item["sample_count"])) if highlight_items else None

    return {
        "most_contributed_entry": most_contributed_entry,
        "fastest_entry": fastest_entry,
        "lowest_ttft_entry": lowest_ttft_entry,
    }


def _build_profile_comparison(
    user_rows: list[dict[str, Any]], global_rows: list[dict[str, Any]]
) -> dict[str, Any]:
    my_tps_values = [float(row["tps"]) for row in user_rows]
    my_ttft_values = [int(row["ttft_ms"]) for row in user_rows]
    global_tps_values = [float(row["tps"]) for row in global_rows]
    global_ttft_values = [int(row["ttft_ms"]) for row in global_rows]
    my_models_count = len({str(row["model"]) for row in user_rows if row["model"]})

    user_model_sets: dict[int, set[str]] = defaultdict(set)
    for row in global_rows:
        row_user_id = row["user_id"]
        if row_user_id is None or not row["model"]:
            continue
        user_model_sets[int(row_user_id)].add(str(row["model"]))
    global_avg_models_count = round(
        sum(len(model_set) for model_set in user_model_sets.values()) / len(user_model_sets), 1
    ) if user_model_sets else 0.0

    return {
        "my_avg_tps": round(sum(my_tps_values) / len(my_tps_values), 2) if my_tps_values else 0.0,
        "global_avg_tps": round(sum(global_tps_values) / len(global_tps_values), 2) if global_tps_values else 0.0,
        "my_avg_ttft_ms": int(round(sum(my_ttft_values) / len(my_ttft_values))) if my_ttft_values else 0,
        "global_avg_ttft_ms": int(round(sum(global_ttft_values) / len(global_ttft_values))) if global_ttft_values else 0,
        "my_models_count": my_models_count,
        "global_avg_models_count": global_avg_models_count,
    }


async def get_me_profile(
    db,
    user_id: int,
    interval: str | None,
    range_label: str,
    provider: str | None,
    input_length_bucket: str | None,
) -> dict[str, Any]:
    # 详细数据（model_entries、distribution）使用用户选择的时间范围
    user_rows = await fetch_user_rows(db, user_id, interval, input_length_bucket, provider)
    global_rows = await fetch_global_rows(db, interval, input_length_bucket, provider)

    # highlights 和 comparison 始终使用全部时间的数据
    user_rows_all = await fetch_user_rows(db, user_id, None, None, None)
    global_rows_all = await fetch_global_rows(db, None, None, None)

    global_entry_map = _build_global_entry_map(global_rows)
    model_groups, provider_distribution, bucket_distribution, _, _, _ = _aggregate_user_reports(user_rows)

    model_entries = _build_profile_model_entries(model_groups, global_entry_map)
    total_samples = len(user_rows)
    provider_distribution_items = _build_provider_distribution_items(provider_distribution, total_samples)
    input_length_distribution_items = _build_input_length_distribution_items(bucket_distribution, total_samples)

    _, _, _, highlight_groups_all, _, _ = _aggregate_user_reports(user_rows_all)
    highlights = _build_profile_highlights(highlight_groups_all)
    comparison = _build_profile_comparison(user_rows_all, global_rows_all)

    return {
        "filters": {
            "range": range_label,
            "provider": provider.lower() if provider else None,
            "input_length_bucket": input_length_bucket,
        },
        "model_entries": model_entries,
        "provider_distribution": provider_distribution_items,
        "input_length_distribution": input_length_distribution_items,
        "highlights": highlights,
        "comparison": comparison,
    }


__all__ = [
    "get_me_contribution_heatmap",
    "get_me_overview",
    "get_me_profile",
]
