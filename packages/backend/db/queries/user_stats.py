from typing import Any

from db.adapter import DatabaseAdapter


async def get_user_stats(db, user_id: int) -> dict[str, Any]:
    adapter = DatabaseAdapter(db)
    total_contributions = await adapter.fetchval(
        "SELECT COUNT(*) FROM reports WHERE user_id = $1",
        user_id,
    )

    rank = await adapter.fetchval(
        """
        SELECT ranked.rank
        FROM (
            SELECT user_id, RANK() OVER (ORDER BY COUNT(*) DESC) AS rank
            FROM reports
            WHERE user_id IS NOT NULL
            GROUP BY user_id
        ) AS ranked
        WHERE ranked.user_id = $1
        """,
        user_id,
    )

    rows = await adapter.fetch(
        """
        SELECT
            r.provider,
            r.model,
            ROUND(AVG(r.tps)::numeric, 2) AS my_avg_tps,
            ROUND(AVG(r.ttft_ms)::numeric, 0) AS my_avg_ttft_ms,
            ROUND(global_stats.global_avg_tps::numeric, 2) AS global_avg_tps,
            ROUND(global_stats.global_avg_ttft_ms::numeric, 0) AS global_avg_ttft_ms
        FROM reports r
        JOIN (
            SELECT
                provider,
                model,
                AVG(tps) AS global_avg_tps,
                AVG(ttft_ms) AS global_avg_ttft_ms
            FROM reports
            GROUP BY provider, model
        ) AS global_stats
          ON global_stats.provider = r.provider
         AND global_stats.model = r.model
        WHERE r.user_id = $1
        GROUP BY
            r.provider,
            r.model,
            global_stats.global_avg_tps,
            global_stats.global_avg_ttft_ms
        ORDER BY r.provider, r.model
        """,
        user_id,
    )

    return {
        "total_contributions": int(total_contributions or 0),
        "rank": int(rank or 0),
        "models": rows,
    }


__all__ = ["get_user_stats"]
