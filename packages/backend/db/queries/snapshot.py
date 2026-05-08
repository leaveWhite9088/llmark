from datetime import date, datetime, timezone
from typing import Any

from db.adapter import DatabaseAdapter


async def _fetch_aggregated_user_rows(adapter: DatabaseAdapter) -> list[dict[str, Any]]:
    return await adapter.fetch(
        """
        SELECT
            r.user_id,
            COUNT(*) AS total_contributions,
            COUNT(DISTINCT r.model) AS models_tested,
            AVG(r.tps) AS avg_tps,
            AVG(r.ttft_ms) AS avg_ttft_ms
        FROM reports r
        WHERE r.user_id IS NOT NULL
        GROUP BY r.user_id
        ORDER BY total_contributions DESC, r.user_id ASC
        """
    )


async def _insert_snapshot_row_postgres(
    adapter: DatabaseAdapter, snapshot_date: date, rank: int, row: dict[str, Any]
) -> None:
    await adapter.execute(
        """
        INSERT INTO user_rank_snapshots
        (snapshot_date, user_id, rank, total_contributions, models_tested, avg_tps, avg_ttft_ms)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (snapshot_date, user_id) DO NOTHING
        """,
        snapshot_date,
        int(row["user_id"]),
        rank,
        int(row["total_contributions"] or 0),
        int(row["models_tested"] or 0),
        round(float(row["avg_tps"] or 0.0), 2),
        int(round(float(row["avg_ttft_ms"] or 0.0))),
    )


async def ensure_daily_user_rank_snapshots(db) -> None:
    adapter = DatabaseAdapter(db)
    snapshot_date = datetime.now(timezone.utc).date()
    existing = await adapter.fetchval(
        "SELECT COUNT(*) FROM user_rank_snapshots WHERE snapshot_date = $1", snapshot_date
    )
    if existing:
        return
    rows = await _fetch_aggregated_user_rows(adapter)
    for index, row in enumerate(rows, start=1):
        await _insert_snapshot_row_postgres(adapter, snapshot_date, index, row)


__all__ = ["ensure_daily_user_rank_snapshots"]
