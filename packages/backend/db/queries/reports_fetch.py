from datetime import datetime, timezone
from typing import Any

from db.adapter import DatabaseAdapter

from .helpers import _interval_str_to_cutoff_dt, classify_input_length_bucket

_REPORT_COLUMNS = "provider, model, prompt_tokens, tps, ttft_ms, created_at, input_length_bucket"
_PROFILE_COLUMNS = "user_id, provider, model, prompt_tokens, tps, ttft_ms, created_at, input_length_bucket"


def _filter_rows_by_input_length_bucket(
    rows: list[dict[str, Any]], input_length_bucket: str | None
) -> list[dict[str, Any]]:
    if not input_length_bucket:
        return rows
    return [
        row
        for row in rows
        if (row.get("input_length_bucket") or classify_input_length_bucket(int(row["prompt_tokens"])))
        == input_length_bucket
    ]


async def _fetch_rows(
    adapter: DatabaseAdapter,
    columns: str,
    conditions: list[str],
    params: list[Any],
) -> list[dict[str, Any]]:
    sql = f"SELECT {columns} FROM reports"
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    sql += " ORDER BY created_at DESC"
    return await adapter.fetch(sql, *params)


async def fetch_model_rows(
    db, model: str, interval: str, input_length_bucket: str | None
) -> list[dict[str, Any]]:
    adapter = DatabaseAdapter(db)
    rows = await _fetch_rows(
        adapter,
        _REPORT_COLUMNS,
        ["model ILIKE $1", "created_at >= $2"],
        [model, _interval_str_to_cutoff_dt(interval)],
    )
    return _filter_rows_by_input_length_bucket(rows, input_length_bucket)


async def fetch_provider_rows(
    db, provider: str, interval: str, input_length_bucket: str | None
) -> list[dict[str, Any]]:
    adapter = DatabaseAdapter(db)
    provider_normalized = provider.lower()
    rows = await _fetch_rows(
        adapter,
        _REPORT_COLUMNS,
        ["provider = $1", "created_at >= $2"],
        [provider_normalized, _interval_str_to_cutoff_dt(interval)],
    )
    return _filter_rows_by_input_length_bucket(rows, input_length_bucket)


async def fetch_catalog_rows(
    db, interval: str, input_length_bucket: str | None, model: str | None = None
) -> list[dict[str, Any]]:
    adapter = DatabaseAdapter(db)
    conditions = ["created_at >= $1"]
    params: list[Any] = [_interval_str_to_cutoff_dt(interval)]
    param_idx = 2
    if model:
        conditions.append(f"model ILIKE ${param_idx}")
        params.append(model)
        param_idx += 1
    rows = await _fetch_rows(adapter, _REPORT_COLUMNS, conditions, params)
    return _filter_rows_by_input_length_bucket(rows, input_length_bucket)


async def _fetch_profile_rows(
    db,
    interval: str | None,
    input_length_bucket: str | None,
    provider: str | None = None,
    user_id: int | None = None,
) -> list[dict[str, Any]]:
    adapter = DatabaseAdapter(db)
    conditions: list[str] = []
    params: list[Any] = []
    if user_id is not None:
        params.append(user_id)
        conditions.append(f"user_id = ${len(params)}")
    if interval:
        params.append(_interval_str_to_cutoff_dt(interval))
        conditions.append(f"created_at >= ${len(params)}")
    if provider:
        params.append(provider)
        conditions.append(f"provider = ${len(params)}")
    rows = await _fetch_rows(adapter, _PROFILE_COLUMNS, conditions, params)
    return _filter_rows_by_input_length_bucket(rows, input_length_bucket)


async def fetch_user_rows(
    db,
    user_id: int,
    interval: str | None,
    input_length_bucket: str | None,
    provider: str | None = None,
) -> list[dict[str, Any]]:
    return await _fetch_profile_rows(db, interval, input_length_bucket, provider, user_id)


async def fetch_global_rows(
    db,
    interval: str | None,
    input_length_bucket: str | None,
    provider: str | None = None,
) -> list[dict[str, Any]]:
    return await _fetch_profile_rows(db, interval, input_length_bucket, provider, None)


__all__ = [
    "fetch_catalog_rows",
    "fetch_global_rows",
    "fetch_model_rows",
    "fetch_provider_rows",
    "fetch_user_rows",
]
