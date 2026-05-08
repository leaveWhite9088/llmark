import asyncio
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from constants import DATA_QUALITY_THRESHOLD
from db.adapter import DatabaseAdapter
from utils.model_names import display_model_name

from .filters import get_provider_display_name
from .reports_fetch import fetch_provider_rows


async def _get_provider_info(db, provider: str) -> dict[str, Any]:
    adapter = DatabaseAdapter(db)
    row = await adapter.fetchrow(
        "SELECT provider, display_name, description, policies, logo_url FROM provider_info WHERE provider = $1",
        provider,
    )
    if not row:
        return {
            "display_name": get_provider_display_name(provider),
            "description": None,
            "policies": [],
            "logo_url": None,
        }
    policies = row.get("policies")
    if isinstance(policies, str):
        try:
            policies = json.loads(policies)
        except (json.JSONDecodeError, TypeError):
            policies = []
    if policies is None:
        policies = []
    return {
        "display_name": row.get("display_name") or get_provider_display_name(provider),
        "description": row.get("description"),
        "policies": policies,
        "logo_url": row.get("logo_url"),
    }


def _compute_allocation(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """计算各模型的算力占比分布。"""
    model_counts: dict[str, dict[str, Any]] = defaultdict(lambda: {"sample_count": 0, "tps": []})
    for row in rows:
        model_name = str(row["model"])
        model_counts[model_name]["sample_count"] += 1
        model_counts[model_name]["tps"].append(float(row["tps"]))

    model_avg_tps_map = {
        model_name: round(sum(values["tps"]) / len(values["tps"]), 2) if values["tps"] else 0.0
        for model_name, values in model_counts.items()
    }
    total_model_tps_sum = sum(model_avg_tps_map.values())

    compute_allocation = []
    for model_name, values in model_counts.items():
        sample_count = int(values["sample_count"])
        model_avg_tps = model_avg_tps_map.get(model_name, 0.0)
        percentage = round((model_avg_tps * 100.0 / total_model_tps_sum), 1) if total_model_tps_sum else 0.0
        compute_allocation.append(
            {
                "model": display_model_name(model_name),
                "sample_count": sample_count,
                "percentage": percentage,
                "avg_tps": model_avg_tps,
            }
        )
    compute_allocation.sort(key=lambda item: (-item["percentage"], -item["sample_count"], item["model"]))
    return compute_allocation


async def get_provider_overview(
    db,
    provider: str,
    interval: str,
    input_length_bucket: str | None,
) -> dict[str, Any]:
    rows = await fetch_provider_rows(db, provider, interval, input_length_bucket)
    provider_info = await _get_provider_info(db, provider)
    provider_name = provider_info["display_name"]
    if not rows:
        return {
            "provider": provider.lower(),
            "provider_name": provider_name,
            "overview": {
                "avg_tps": 0.0,
                "avg_ttft_ms": 0,
                "best_combo": None,
                "total_models": 0,
                "total_samples": 0,
            },
            "compute_allocation": [],
            "description": provider_info["description"],
            "policies": provider_info["policies"],
        }

    grouped: dict[str, dict[str, list[float]]] = defaultdict(lambda: {"tps": [], "ttft": []})
    tps_values: list[float] = []
    ttft_values: list[int] = []
    models: set[str] = set()

    for row in rows:
        model_name = str(row["model"])
        models.add(model_name)
        tps_values.append(float(row["tps"]))
        ttft_values.append(int(row["ttft_ms"]))
        grouped[model_name]["tps"].append(float(row["tps"]))
        grouped[model_name]["ttft"].append(int(row["ttft_ms"]))

    best_combo_item = None
    best_candidates = []
    for model_name, values in grouped.items():
        avg_tps = round(sum(values["tps"]) / len(values["tps"]), 2)
        avg_ttft_ms = int(round(sum(values["ttft"]) / len(values["ttft"])))
        best_candidates.append((avg_tps, avg_ttft_ms, model_name))
    if best_candidates:
        best_candidates.sort(key=lambda item: (-item[0], item[1], item[2]))
        best_avg_tps, best_avg_ttft_ms, best_model = best_candidates[0]
        best_combo_item = {
            "model": display_model_name(best_model),
            "tps": best_avg_tps,
            "ttft_ms": best_avg_ttft_ms,
        }

    compute_allocation = _compute_allocation(rows)

    return {
        "provider": provider.lower(),
        "provider_name": provider_name,
        "overview": {
            "avg_tps": round(sum(tps_values) / len(tps_values), 2),
            "avg_ttft_ms": int(round(sum(ttft_values) / len(ttft_values))),
            "best_combo": best_combo_item,
            "total_models": len(models),
            "total_samples": len(rows),
        },
        "compute_allocation": compute_allocation,
        "description": provider_info["description"],
        "policies": provider_info["policies"],
    }


async def get_provider_models(
    db,
    provider: str,
    interval: str,
    input_length_bucket: str | None,
    model: str | None,
) -> dict[str, Any]:
    rows = await fetch_provider_rows(db, provider, interval, input_length_bucket)
    available_models = sorted({str(row["model"]) for row in rows if row["model"]})

    grouped: dict[str, dict[str, list[float]]] = defaultdict(lambda: {"tps": [], "ttft": []})
    for row in rows:
        if model and str(row["model"]) != model:
            continue
        model_name = str(row["model"])
        grouped[model_name]["tps"].append(float(row["tps"]))
        grouped[model_name]["ttft"].append(int(row["ttft_ms"]))

    items = []
    for model_name, values in grouped.items():
        sample_count = len(values["tps"])
        items.append(
            {
                "model": display_model_name(model_name),
                "input_length_bucket": input_length_bucket,
                "avg_tps": round(sum(values["tps"]) / sample_count, 2),
                "avg_ttft_ms": int(round(sum(values["ttft"]) / sample_count)),
                "sample_count": sample_count,
                "data_quality": "sufficient" if sample_count >= DATA_QUALITY_THRESHOLD else "limited",
            }
        )

    items.sort(key=lambda item: (-item["avg_tps"], item["avg_ttft_ms"], item["model"]))
    return {
        "items": items,
        "available_filters": {
            "models": available_models,
        },
    }


async def get_provider_stats(
    db,
    provider: str,
    interval: str,
    input_length_bucket: str | None,
) -> dict[str, Any]:
    rows = await fetch_provider_rows(db, provider, interval, input_length_bucket)
    provider_name = get_provider_display_name(provider)
    compute_allocation = _compute_allocation(rows)

    return {
        "provider": provider.lower(),
        "provider_name": provider_name,
        "compute_allocation": compute_allocation,
    }


async def get_provider_models_info(
    db,
    provider: str,
    model: str | None,
) -> dict[str, Any]:
    """获取某厂商下模型的基本信息（displayName 映射等）。"""
    adapter = DatabaseAdapter(db)

    # 获取该厂商下有数据的模型列表
    if model:
        rows = await adapter.fetch(
            "SELECT DISTINCT model FROM reports WHERE provider = $1 AND model ILIKE $2",
            provider, model,
        )
    else:
        rows = await adapter.fetch(
            "SELECT DISTINCT model FROM reports WHERE provider = $1",
            provider,
        )

    models = [str(row["model"]) for row in rows if row.get("model")]
    if not models:
        return {"items": []}

    # 批量查询 model_meta
    items = []
    for model_name in sorted(models):
        meta_row = await adapter.fetchrow(
            "SELECT display_name, tags, context_window, release_date, description FROM model_meta WHERE model = $1",
            model_name,
        )
        tags = meta_row.get("tags") if meta_row else None
        if isinstance(tags, str):
            try:
                tags = json.loads(tags)
            except (json.JSONDecodeError, TypeError):
                tags = []
        if tags is None:
            tags = []
        context_window = meta_row.get("context_window") if meta_row else None
        context_window_str = str(context_window) if context_window else None
        display_name = meta_row.get("display_name") if meta_row else None
        if not display_name:
            display_name = display_model_name(model_name)
        items.append({
            "model": display_name,
            "parameters": None,  # 当前 model_meta 表无此字段
            "context_window": context_window_str,
            "release_date": meta_row.get("release_date") if meta_row else None,
            "description": meta_row.get("description") if meta_row else None,
            "tags": tags,
        })

    return {"items": items}


__all__ = [
    "get_provider_models",
    "get_provider_models_info",
    "get_provider_overview",
    "get_provider_stats",
]
