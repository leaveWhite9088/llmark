from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from db.adapter import DatabaseAdapter

from .filters import get_provider_display_name
from .helpers import (
    _bucket_time,
    _interval_str_to_cutoff_dt,
    _interval_to_delta,
    _parse_dt,
    _percentile,
    classify_input_length_bucket,
)


def _build_trend_result(
    rows: list[dict[str, Any]],
    bucket_unit: str,
    input_length_bucket: str | None,
) -> tuple[list[dict[str, Any]], int]:
    buckets: dict[str, dict[str, Any]] = defaultdict(lambda: {"tps": [], "ttft": []})
    sample_count = 0
    for row in rows:
        row_input_length_bucket = row["input_length_bucket"] or classify_input_length_bucket(int(row["prompt_tokens"]))
        if input_length_bucket and row_input_length_bucket != input_length_bucket:
            continue
        sample_count += 1
        key = _bucket_time(_parse_dt(row["created_at"]), bucket_unit)
        buckets[key]["tps"].append(float(row["tps"]))
        buckets[key]["ttft"].append(int(row["ttft_ms"]))
    result = []
    for key in sorted(buckets.keys()):
        ttft_values = sorted(buckets[key]["ttft"])
        result.append(
            {
                "time": key,
                "avg_tps": round(sum(buckets[key]["tps"]) / len(buckets[key]["tps"]), 2),
                "avg_ttft_ms": int(round(sum(ttft_values) / len(ttft_values))),
                "p99_ttft_ms": _percentile(ttft_values, 0.99),
            }
        )
    return result, sample_count


async def get_detail_trend(
    db,
    provider: str,
    model: str,
    interval: str,
    bucket_unit: str,
    input_length_bucket: str | None,
) -> dict[str, Any]:
    adapter = DatabaseAdapter(db)
    params = [provider.lower(), model, _interval_str_to_cutoff_dt(interval)]
    conditions = [
        "provider = $1",
        "model ILIKE $2",
        "created_at >= $3",
    ]
    sql = f"""
        SELECT created_at, prompt_tokens, tps, ttft_ms, input_length_bucket
        FROM reports
        WHERE {' AND '.join(conditions)}
        ORDER BY created_at ASC
    """
    rows = await adapter.fetch(sql, *params)
    trend, sample_count = _build_trend_result(rows, bucket_unit, input_length_bucket)
    return {"trend": trend, "sample_count": sample_count}


async def get_detail_by_model(
    db,
    model: str,
    interval: str,
    bucket_unit: str,
    input_length_bucket: str | None,
) -> dict[str, list[dict[str, Any]]]:
    adapter = DatabaseAdapter(db)
    params = [model, _interval_str_to_cutoff_dt(interval)]
    conditions = [
        "model ILIKE $1",
        "created_at >= $2",
    ]
    sql = f"""
        SELECT provider, model, prompt_tokens, tps, ttft_ms, created_at, input_length_bucket
        FROM reports
        WHERE {' AND '.join(conditions)}
        ORDER BY created_at ASC
    """
    rows = await adapter.fetch(sql, *params)
    return _build_detail_by_model_payload(
        rows=rows,
        cutoff_dt=None,
        bucket_unit=bucket_unit,
        input_length_bucket=input_length_bucket,
    )


def _build_detail_by_model_payload(
    rows: list[Any],
    cutoff_dt: datetime | None,
    bucket_unit: str,
    input_length_bucket: str | None,
) -> dict[str, list[dict[str, Any]]]:
    provider_groups: dict[str, dict[str, Any]] = {}

    for row in rows:
        created_at = _parse_dt(row["created_at"])
        if cutoff_dt and created_at < cutoff_dt:
            continue
        row_input_length_bucket = row["input_length_bucket"] or classify_input_length_bucket(int(row["prompt_tokens"]))
        if input_length_bucket and row_input_length_bucket != input_length_bucket:
            continue

        provider = str(row["provider"])
        provider_group = provider_groups.setdefault(
            provider,
            {
                "provider": provider,
                "provider_name": get_provider_display_name(provider),
                "metric_tps": [],
                "metric_ttft": [],
                "trend_buckets": defaultdict(lambda: {"tps": [], "ttft": []}),
            },
        )
        provider_group["metric_tps"].append(float(row["tps"]))
        provider_group["metric_ttft"].append(int(row["ttft_ms"]))

        trend_key = _bucket_time(created_at, bucket_unit)
        provider_group["trend_buckets"][trend_key]["tps"].append(float(row["tps"]))
        provider_group["trend_buckets"][trend_key]["ttft"].append(int(row["ttft_ms"]))

    providers_payload: list[dict[str, Any]] = []
    for provider_group in provider_groups.values():
        sample_count = len(provider_group["metric_tps"])
        if sample_count == 0:
            continue

        trend = []
        for time_key in sorted(provider_group["trend_buckets"].keys()):
            ttft_values = sorted(provider_group["trend_buckets"][time_key]["ttft"])
            trend.append(
                {
                    "time": time_key,
                    "avg_tps": round(
                        sum(provider_group["trend_buckets"][time_key]["tps"])
                        / len(provider_group["trend_buckets"][time_key]["tps"]),
                        2,
                    ),
                    "avg_ttft_ms": int(round(sum(ttft_values) / len(ttft_values))),
                    "p99_ttft_ms": _percentile(ttft_values, 0.99),
                }
            )

        providers_payload.append(
            {
                "provider": provider_group["provider"],
                "provider_name": provider_group["provider_name"],
                "metrics": {
                    "avg_tps": round(sum(provider_group["metric_tps"]) / sample_count, 2),
                    "avg_ttft_ms": int(round(sum(provider_group["metric_ttft"]) / sample_count)),
                    "sample_count": sample_count,
                },
                "trend": trend,
            }
        )

    providers_payload.sort(
        key=lambda item: (-item["metrics"]["avg_tps"], item["metrics"]["avg_ttft_ms"], item["provider"])
    )
    return {"providers": providers_payload}


__all__ = [
    "get_detail_by_model",
    "get_detail_trend",
]
