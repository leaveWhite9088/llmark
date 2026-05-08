import json
from datetime import datetime, timedelta, timezone
from typing import Any

from constants import DATA_QUALITY_THRESHOLD
from db.adapter import DatabaseAdapter
from db.cache import cache_get, cache_set
from utils.model_names import display_model_name

from .helpers import aggregate_metrics, classify_input_length_bucket, _isoformat_or_none, _parse_dt


async def _get_model_tags_map(db, models: set[str]) -> dict[str, list[str]]:
    if not models:
        return {}
    adapter = DatabaseAdapter(db)
    model_list = list(models)
    placeholders = ",".join([f"${i + 1}" for i in range(len(model_list))])
    rows = await adapter.fetch(
        f"SELECT model, tags FROM model_meta WHERE LOWER(model) IN ({placeholders})",
        *[m.lower() for m in model_list],
    )

    result: dict[str, list[str]] = {}
    for row in rows:
        model_name = str(row["model"]).lower()
        tags = row.get("tags")
        if isinstance(tags, str):
            try:
                tags = json.loads(tags)
            except (json.JSONDecodeError, TypeError):
                tags = []
        if tags is None:
            tags = []
        result[model_name] = tags
    return result


def _sort_results(results: list[dict[str, Any]], sort_by: str) -> None:
    if sort_by == "tps":
        results.sort(key=lambda r: (-r["avg_tps"], r["avg_ttft_ms"]))
    else:
        results.sort(key=lambda r: (r["avg_ttft_ms"], -r["avg_tps"]))


def _compute_rank_map(results: list[dict[str, Any]]) -> dict[tuple[str, str], int]:
    return {r["key"]: i + 1 for i, r in enumerate(results)}


async def get_leaderboard(
    db,
    sort_by: str,
    range: str = "24h",
    provider: str | None = None,
    model: str | None = None,
    input_length_bucket: str | None = None,
) -> list[dict[str, Any]]:
    cached = await cache_get(
        "leaderboard",
        sort_by=sort_by,
        range=range,
        provider=provider,
        model=model,
        input_length_bucket=input_length_bucket,
    )
    if cached is not None:
        return cached

    adapter = DatabaseAdapter(db)
    range_hours = {"24h": 24, "7d": 168, "30d": 720}[range]
    now = datetime.now(timezone.utc)
    current_cutoff = now - timedelta(hours=range_hours)
    prev_cutoff = now - timedelta(hours=range_hours * 2)

    # 获取当前周期 + 前一周期的数据
    conditions: list[str] = []
    params: list[Any] = []

    conditions.append("created_at >= $1")
    params.append(datetime.now(timezone.utc) - timedelta(hours=range_hours * 2))
    if provider:
        params.append(provider.lower())
        conditions.append(f"provider = ${len(params)}")
    if model:
        params.append(f"%{model}%")
        conditions.append(f"model ILIKE ${len(params)}")
    rows = await adapter.fetch(
        f"""
        SELECT provider, model, prompt_tokens, tps, ttft_ms, created_at, input_length_bucket
        FROM reports
        WHERE {' AND '.join(conditions)}
        """,
        *params,
    )

    current_groups: dict[tuple[str, str], dict[str, Any]] = {}
    prev_groups: dict[tuple[str, str], dict[str, Any]] = {}
    last_reported: dict[tuple[str, str], datetime] = {}

    for row in rows:
        row_bucket = row["input_length_bucket"] or classify_input_length_bucket(int(row["prompt_tokens"]))
        if input_length_bucket and row_bucket != input_length_bucket:
            continue

        key = (str(row["provider"]), str(row["model"]))
        created_at = _parse_dt(row["created_at"])

        if key not in last_reported or created_at > last_reported[key]:
            last_reported[key] = created_at

        target = current_groups if created_at >= current_cutoff else prev_groups
        if key not in target:
            target[key] = {"tps_values": [], "ttft_values": []}
        target[key]["tps_values"].append(float(row["tps"]))
        target[key]["ttft_values"].append(int(row["ttft_ms"]))

    # 获取 tags
    all_models = {key[1] for key in current_groups}
    tags_map = await _get_model_tags_map(db, all_models)

    # 当前周期结果
    current_results: list[dict[str, Any]] = []
    for key, values in current_groups.items():
        agg = aggregate_metrics(values["tps_values"], values["ttft_values"])
        current_results.append(
            {
                "key": key,
                "provider": key[0],
                "model": display_model_name(key[1]),
                "avg_tps": agg["avg_tps"],
                "avg_ttft_ms": agg["avg_ttft_ms"],
                "sample_count": agg["sample_count"],
                "input_length_bucket": input_length_bucket,
                "data_quality": "sufficient" if agg["sample_count"] >= DATA_QUALITY_THRESHOLD else "limited",
                "last_reported_at": _isoformat_or_none(last_reported.get(key)),
                "tags": tags_map.get(key[1].lower()),
            }
        )

    _sort_results(current_results, sort_by)
    current_rank_map = _compute_rank_map(current_results)

    # 前一周期的结果（仅用于排名和趋势）
    prev_results: list[dict[str, Any]] = []
    for key, values in prev_groups.items():
        agg = aggregate_metrics(values["tps_values"], values["ttft_values"])
        prev_results.append(
            {
                "key": key,
                "avg_tps": agg["avg_tps"],
                "avg_ttft_ms": agg["avg_ttft_ms"],
                "sample_count": agg["sample_count"],
            }
        )

    _sort_results(prev_results, sort_by)
    prev_rank_map = _compute_rank_map(prev_results)

    # 组装最终输出：仅保留当前周期有数据的项目
    final_results: list[dict[str, Any]] = []
    for result in current_results:
        key = result["key"]
        current_rank = current_rank_map[key]
        prev_rank = prev_rank_map.get(key)

        result["rank_change"] = prev_rank - current_rank if prev_rank is not None else None

        prev_data = prev_groups.get(key)
        if prev_data:
            prev_agg = aggregate_metrics(prev_data["tps_values"], prev_data["ttft_values"])
            result["trend_tps_change"] = round(result["avg_tps"] - prev_agg["avg_tps"], 2)
            result["trend_ttft_change"] = result["avg_ttft_ms"] - prev_agg["avg_ttft_ms"]
            result["trend_samples_change"] = result["sample_count"] - prev_agg["sample_count"]
        else:
            result["trend_tps_change"] = None
            result["trend_ttft_change"] = None
            result["trend_samples_change"] = None

        del result["key"]
        final_results.append(result)

    await cache_set("leaderboard", final_results, sort_by=sort_by, range=range, provider=provider, model=model, input_length_bucket=input_length_bucket)
    return final_results


__all__ = ["get_leaderboard"]
