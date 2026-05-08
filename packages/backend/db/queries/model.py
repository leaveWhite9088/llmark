import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from constants import DATA_QUALITY_THRESHOLD
from db.adapter import DatabaseAdapter

from utils.model_names import display_model_name

from .filters import get_provider_display_name
from .helpers import _parse_dt
from .reports_fetch import fetch_model_rows


async def _get_model_meta(db, model: str) -> dict[str, Any] | None:
    adapter = DatabaseAdapter(db)
    row = await adapter.fetchrow(
        "SELECT model, display_name, tags, context_window, release_date, description FROM model_meta WHERE model = $1",
        model,
    )
    if not row:
        return None
    tags = row.get("tags")
    if isinstance(tags, str):
        try:
            tags = json.loads(tags)
        except (json.JSONDecodeError, TypeError):
            tags = []
    if tags is None:
        tags = []
    return {
        "display_name": row.get("display_name"),
        "tags": tags,
        "context_window": row.get("context_window"),
        "release_date": row.get("release_date"),
        "description": row.get("description"),
    }


async def get_model_overview(
    db,
    model: str,
    interval: str,
    input_length_bucket: str | None,
) -> dict[str, Any]:
    rows = await fetch_model_rows(db, model, interval, input_length_bucket)
    if not rows:
        return {
            "model": display_model_name(model),
            "overview": {
                "avg_tps": 0.0,
                "avg_ttft_ms": 0,
                "best_combo": None,
                "total_providers": 0,
                "total_samples": 0,
            },
        }

    grouped: dict[str, dict[str, list[float]]] = defaultdict(lambda: {"tps": [], "ttft": []})
    tps_values: list[float] = []
    ttft_values: list[int] = []
    providers: set[str] = set()

    for row in rows:
        provider = str(row["provider"])
        providers.add(provider)
        tps_values.append(float(row["tps"]))
        ttft_values.append(int(row["ttft_ms"]))
        grouped[provider]["tps"].append(float(row["tps"]))
        grouped[provider]["ttft"].append(int(row["ttft_ms"]))

    best_combo = None
    ranked = []
    for provider, values in grouped.items():
        avg_tps = round(sum(values["tps"]) / len(values["tps"]), 2)
        avg_ttft_ms = int(round(sum(values["ttft"]) / len(values["ttft"])))
        ranked.append((avg_tps, avg_ttft_ms, provider))
    if ranked:
        ranked.sort(key=lambda item: (-item[0], item[1], item[2]))
        best_avg_tps, best_avg_ttft_ms, best_provider = ranked[0]
        best_combo = {
            "provider": best_provider,
            "provider_name": get_provider_display_name(best_provider),
            "tps": best_avg_tps,
            "ttft_ms": best_avg_ttft_ms,
        }

    return {
        "model": display_model_name(model),
        "overview": {
            "avg_tps": round(sum(tps_values) / len(tps_values), 2),
            "avg_ttft_ms": int(round(sum(ttft_values) / len(ttft_values))),
            "best_combo": best_combo,
            "total_providers": len(providers),
            "total_samples": len(rows),
        },
    }


async def get_model_entries(
    db,
    model: str,
    interval: str,
    input_length_bucket: str | None,
    provider: str | None,
    sort_by: str,
    sort_order: str,
) -> dict[str, Any]:
    rows = await fetch_model_rows(db, model, interval, input_length_bucket)
    available_providers = sorted({str(row["provider"]) for row in rows if row["provider"]})

    grouped: dict[str, dict[str, list[float]]] = defaultdict(lambda: {"tps": [], "ttft": []})
    for row in rows:
        provider_value = str(row["provider"])
        if provider and provider_value != provider.lower():
            continue
        grouped[provider_value]["tps"].append(float(row["tps"]))
        grouped[provider_value]["ttft"].append(int(row["ttft_ms"]))

    items = []
    for provider_value, values in grouped.items():
        sample_count = len(values["tps"])
        items.append(
            {
                "provider": provider_value,
                "provider_name": get_provider_display_name(provider_value),
                "input_length_bucket": input_length_bucket,
                "avg_tps": round(sum(values["tps"]) / sample_count, 2),
                "avg_ttft_ms": int(round(sum(values["ttft"]) / sample_count)),
                "sample_count": sample_count,
                "data_quality": "sufficient" if sample_count >= DATA_QUALITY_THRESHOLD else "limited",
            }
        )

    if sort_by == "tps" and sort_order == "desc":
        key = lambda item: (-item["avg_tps"], item["avg_ttft_ms"], item["provider"])
    elif sort_by == "sample_count" and sort_order == "desc":
        key = lambda item: (-item["sample_count"], item["provider"])
    elif sort_by == "tps":
        key = lambda item: (item["avg_tps"], item["avg_ttft_ms"], item["provider"])
    elif sort_by == "ttft":
        key = lambda item: (item["avg_ttft_ms"], item["provider"])
    elif sort_by == "sample_count":
        key = lambda item: (item["sample_count"], item["provider"])
    elif sort_by == "provider":
        key = lambda item: (item["provider"],)
    else:
        key = lambda item: (item["avg_tps"], item["avg_ttft_ms"], item["provider"])

    items.sort(key=key)

    meta = await _get_model_meta(db, model)
    return {
        "items": items,
        "available_filters": {
            "providers": available_providers,
        },
        "meta": meta,
    }


async def get_model_provider_comparison(
    db,
    model: str,
    input_length_bucket: str | None,
) -> dict[str, Any]:
    rows = await fetch_model_rows(db, model, "30 days", input_length_bucket)
    now = datetime.now(timezone.utc)
    interval_map = {
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
    }

    data: dict[str, list[dict[str, Any]]] = {}
    for label, delta in interval_map.items():
        cutoff_dt = now - delta
        grouped: dict[str, dict[str, list[float]]] = defaultdict(lambda: {"tps": [], "ttft": []})
        for row in rows:
            created_at = _parse_dt(row["created_at"])
            if created_at < cutoff_dt:
                continue
            provider = str(row["provider"])
            grouped[provider]["tps"].append(float(row["tps"]))
            grouped[provider]["ttft"].append(int(row["ttft_ms"]))

        items = []
        for provider, values in grouped.items():
            if not values["tps"]:
                continue
            items.append(
                {
                    "provider": provider,
                    "name": get_provider_display_name(provider),
                    "avg_tps": round(sum(values["tps"]) / len(values["tps"]), 2),
                    "avg_ttft_ms": int(round(sum(values["ttft"]) / len(values["ttft"]))),
                }
            )
        items.sort(key=lambda item: (-item["avg_tps"], item["avg_ttft_ms"], item["provider"]))
        data[label] = items

    return {
        "model": display_model_name(model),
        "data": data,
    }


__all__ = [
    "get_model_entries",
    "get_model_overview",
    "get_model_provider_comparison",
]
