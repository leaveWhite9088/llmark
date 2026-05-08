from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from constants import DATA_QUALITY_THRESHOLD
from db.cache import cache_get, cache_set
from utils.model_names import display_model_name

from .filters import get_provider_display_name
from .helpers import _parse_dt, sort_items
from .reports_fetch import fetch_catalog_rows


async def get_models_catalog(
    db,
    interval: str,
    input_length_bucket: str | None,
    sort_by: str,
    sort_order: str,
) -> dict[str, Any]:
    cached = await cache_get(
        "models_catalog",
        interval=interval,
        input_length_bucket=input_length_bucket,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    if cached is not None:
        return cached

    rows = await fetch_catalog_rows(db, interval, input_length_bucket)
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        model_name = str(row["model"])
        provider_name = str(row["provider"])
        item = grouped.setdefault(
            model_name,
            {
                "model": model_name,
                "providers": set(),
                "tps": [],
                "ttft": [],
                "total_samples": 0,
                "provider_rows": defaultdict(lambda: {"tps": [], "ttft": []}),
            },
        )
        item["providers"].add(provider_name)
        item["tps"].append(float(row["tps"]))
        item["ttft"].append(int(row["ttft_ms"]))
        item["total_samples"] += 1
        item["provider_rows"][provider_name]["tps"].append(float(row["tps"]))
        item["provider_rows"][provider_name]["ttft"].append(int(row["ttft_ms"]))

    items = []
    for model_name, item in grouped.items():
        best_provider = None
        ranked = []
        for provider_name, values in item["provider_rows"].items():
            avg_tps = round(sum(values["tps"]) / len(values["tps"]), 2)
            ranked.append((avg_tps, provider_name))
        if ranked:
            ranked.sort(key=lambda value: (-value[0], value[1]))
            best_avg_tps, best_provider_name = ranked[0]
            best_provider = {
                "name": best_provider_name,
                "display_name": get_provider_display_name(best_provider_name),
                "avg_tps": best_avg_tps,
            }

        items.append(
            {
                "model": display_model_name(model_name),
                "provider_count": len(item["providers"]),
                "avg_tps": round(sum(item["tps"]) / len(item["tps"]), 2),
                "avg_ttft_ms": int(round(sum(item["ttft"]) / len(item["ttft"]))),
                "total_samples": item["total_samples"],
                "best_provider": best_provider,
            }
        )

    _sort_models_catalog(items, sort_by, sort_order)
    result = {"items": items, "total": len(items)}
    await cache_set("models_catalog", result, interval=interval, input_length_bucket=input_length_bucket, sort_by=sort_by, sort_order=sort_order)
    return result


async def get_model_providers_catalog(
    db,
    model: str,
    interval: str,
    input_length_bucket: str | None,
) -> dict[str, Any]:
    rows = await fetch_catalog_rows(db, interval, input_length_bucket, model=model)
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        provider_name = str(row["provider"])
        item = grouped.setdefault(
            provider_name,
            {
                "provider": provider_name,
                "provider_name": get_provider_display_name(provider_name),
                "tps": [],
                "ttft": [],
                "sample_count": 0,
            },
        )
        item["tps"].append(float(row["tps"]))
        item["ttft"].append(int(row["ttft_ms"]))
        item["sample_count"] += 1

    providers = []
    for provider_name, item in grouped.items():
        providers.append(
            {
                "provider": provider_name,
                "provider_name": item["provider_name"],
                "avg_tps": round(sum(item["tps"]) / len(item["tps"]), 2),
                "avg_ttft_ms": int(round(sum(item["ttft"]) / len(item["ttft"]))),
                "sample_count": item["sample_count"],
                "data_quality": "sufficient" if item["sample_count"] >= DATA_QUALITY_THRESHOLD else "limited",
            }
        )

    providers.sort(key=lambda item: (-item["avg_tps"], item["avg_ttft_ms"], item["provider"]))
    return {"model": display_model_name(model), "providers": providers}


async def get_providers_catalog(
    db,
    interval: str,
    input_length_bucket: str | None,
    sort_by: str,
    sort_order: str,
) -> dict[str, Any]:
    cached = await cache_get(
        "providers_catalog",
        interval=interval,
        input_length_bucket=input_length_bucket,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    if cached is not None:
        return cached

    rows = await fetch_catalog_rows(db, interval, input_length_bucket)
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        provider_name = str(row["provider"])
        model_name = str(row["model"])
        item = grouped.setdefault(
            provider_name,
            {
                "provider": provider_name,
                "name": get_provider_display_name(provider_name),
                "logo_url": f"/assets/logo/{provider_name}.png",
                "models": set(),
                "tps": [],
                "ttft": [],
                "total_samples": 0,
                "model_stats": {},
            },
        )
        item["models"].add(model_name)
        item["tps"].append(float(row["tps"]))
        item["ttft"].append(int(row["ttft_ms"]))
        item["total_samples"] += 1
        if model_name not in item["model_stats"]:
            item["model_stats"][model_name] = {"tps": [], "ttft": [], "samples": 0}
        item["model_stats"][model_name]["tps"].append(float(row["tps"]))
        item["model_stats"][model_name]["ttft"].append(int(row["ttft_ms"]))
        item["model_stats"][model_name]["samples"] += 1

    items = []
    for provider_name, item in grouped.items():
        model_list = []
        for model_name, stats in item["model_stats"].items():
            avg_tps = round(sum(stats["tps"]) / len(stats["tps"]), 2)
            avg_ttft = int(round(sum(stats["ttft"]) / len(stats["ttft"])))
            model_list.append(
                {
                    "name": display_model_name(model_name),
                    "avg_tps": avg_tps,
                    "avg_ttft_ms": avg_ttft,
                    "sample_count": stats["samples"],
                }
            )

        top_models = []
        if model_list:
            model_list.sort(key=lambda value: -value["sample_count"])
            top_models = model_list[:3]

        items.append(
            {
                "provider": provider_name,
                "name": item["name"],
                "logo_url": item["logo_url"],
                "model_count": len(item["models"]),
                "avg_tps": round(sum(item["tps"]) / len(item["tps"]), 2),
                "avg_ttft_ms": int(round(sum(item["ttft"]) / len(item["ttft"]))),
                "total_samples": item["total_samples"],
                "top_models": top_models,
            }
        )

    _sort_providers_catalog(items, sort_by, sort_order)
    result = {"items": items, "total": len(items)}
    await cache_set("providers_catalog", result, interval=interval, input_length_bucket=input_length_bucket, sort_by=sort_by, sort_order=sort_order)
    return result


def _sort_models_catalog(items: list[dict[str, Any]], sort_by: str, sort_order: str) -> None:
    if sort_by == "tps" and sort_order == "desc":
        items.sort(key=lambda item: (-item["avg_tps"], item["avg_ttft_ms"], item["model"]))
        return
    if sort_by == "tps":
        items.sort(key=lambda item: (item["avg_tps"], item["avg_ttft_ms"], item["model"]))
        return
    sort_items(
        items,
        sort_by,
        sort_order,
        {
            "ttft": lambda item: (item["avg_ttft_ms"], item["model"]),
            "sample_count": lambda item: (item["total_samples"], item["model"]),
            "provider_count": lambda item: (item["provider_count"], item["model"]),
            "name": lambda item: item["model"],
        },
    )


def _sort_providers_catalog(items: list[dict[str, Any]], sort_by: str, sort_order: str) -> None:
    if sort_by == "tps" and sort_order == "desc":
        items.sort(key=lambda item: (-item["avg_tps"], item["avg_ttft_ms"], item["provider"]))
        return
    if sort_by == "tps":
        items.sort(key=lambda item: (item["avg_tps"], item["avg_ttft_ms"], item["provider"]))
        return
    sort_items(
        items,
        sort_by,
        sort_order,
        {
            "ttft": lambda item: (item["avg_ttft_ms"], item["provider"]),
            "sample_count": lambda item: (item["total_samples"], item["provider"]),
            "model_count": lambda item: (item["model_count"], item["provider"]),
            "name": lambda item: item["provider"],
        },
    )


__all__ = [
    "get_model_providers_catalog",
    "get_models_catalog",
    "get_providers_catalog",
]
