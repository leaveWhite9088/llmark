from typing import Any

from db.adapter import DatabaseAdapter
from db.cache import cache_delete_pattern


async def insert_report(db, payload: dict[str, Any]) -> int:
    adapter = DatabaseAdapter(db)
    report_id = await adapter.insert(
        """
        INSERT INTO reports (
            device_id, user_id, provider, model, prompt_tokens,
            completion_tokens, ttft_ms, total_ms, tps, ip_hash, input_length_bucket
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
        """,
        payload["device_id"],
        payload["user_id"],
        payload["provider"],
        payload["model"],
        payload["prompt_tokens"],
        payload["completion_tokens"],
        payload["ttft_ms"],
        payload["total_ms"],
        payload["tps"],
        payload["ip_hash"],
        payload["input_length_bucket"],
    )
    await cache_delete_pattern("leaderboard")
    await cache_delete_pattern("users_leaderboard")
    await cache_delete_pattern("models_catalog")
    await cache_delete_pattern("providers_catalog")
    return report_id


async def bind_device_to_user(db, device_id: str, user_id: int) -> None:
    adapter = DatabaseAdapter(db)
    await adapter.execute(
        """
        INSERT INTO device_bindings (device_id, user_id, bound_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (device_id) DO UPDATE SET user_id = $2, bound_at = NOW()
        """,
        device_id,
        user_id,
    )
    await adapter.execute(
        """
        UPDATE reports
        SET user_id = $2
        WHERE device_id = $1
          AND user_id IS NULL
        """,
        device_id,
        user_id,
    )


async def check_report_anomaly(db, provider: str, model: str, tps: float) -> bool:
    """防刷榜第三层：统计异常检测。

    查询该 provider + model 近 7 天的历史平均 tps，
    若当前 tps 偏离均值 3 倍以上，判定为异常数据。
    """
    adapter = DatabaseAdapter(db)
    row = await adapter.fetchrow(
        """
        SELECT AVG(tps) as avg_tps
        FROM reports
        WHERE provider ILIKE $1
          AND model ILIKE $2
          AND created_at >= NOW() - INTERVAL '7 days'
        """,
        provider,
        model,
    )
    if row is None or row["avg_tps"] is None:
        return True
    avg_tps = float(row["avg_tps"])
    if avg_tps == 0:
        return True
    ratio = tps / avg_tps
    return 1 / 3 <= ratio <= 3


__all__ = [
    "bind_device_to_user",
    "check_report_anomaly",
    "insert_report",
]
