from datetime import datetime, timedelta, timezone
from typing import Any

from db.adapter import DatabaseAdapter

from .filters import get_provider_display_name
from .helpers import _parse_dt
from .reports_fetch import fetch_model_rows


async def get_model_insights(
    db,
    model: str,
    provider: str | None,
    interval: str,
    input_length_bucket: str | None,
) -> dict[str, Any]:
    """
    根据模型和厂商的实测数据生成洞察摘要。
    维度：速度表现（speed）、趋势变化（trend）、稳定性评估（stability）、样本充足度（sample）。
    """
    rows = await fetch_model_rows(db, model, interval, input_length_bucket)

    # 按 provider 过滤
    if provider:
        rows = [row for row in rows if str(row.get("provider", "")).lower() == provider.lower()]

    if not rows:
        return {"insights": []}

    insights: list[dict[str, str]] = []

    # 计算基础统计
    tps_values = [float(row["tps"]) for row in rows]
    ttft_values = [int(row["ttft_ms"]) for row in rows]
    avg_tps = sum(tps_values) / len(tps_values)
    avg_ttft = sum(ttft_values) / len(ttft_values)
    sample_count = len(rows)
    providers = {str(row.get("provider", "")) for row in rows if row.get("provider")}

    # 1. 速度表现 insight
    if avg_tps >= 100:
        speed_desc = f"该模型平均 TPS 达到 {avg_tps:.1f}，表现优异，适合高并发场景。"
    elif avg_tps >= 50:
        speed_desc = f"该模型平均 TPS 为 {avg_tps:.1f}，速度表现良好。"
    else:
        speed_desc = f"该模型平均 TPS 为 {avg_tps:.1f}，速度一般，适合对延迟不敏感的场景。"
    insights.append({"icon": "speed", "title": "速度表现", "description": speed_desc})

    # 2. 趋势变化 insight（对比前半段和后半段数据）
    if sample_count >= 20:
        sorted_rows = sorted(rows, key=lambda r: _parse_dt(r["created_at"]))
        mid = len(sorted_rows) // 2
        first_half_tps = [float(r["tps"]) for r in sorted_rows[:mid]]
        second_half_tps = [float(r["tps"]) for r in sorted_rows[mid:]]
        first_avg = sum(first_half_tps) / len(first_half_tps) if first_half_tps else 0
        second_avg = sum(second_half_tps) / len(second_half_tps) if second_half_tps else 0
        change = second_avg - first_avg
        if abs(change) / max(first_avg, 1) > 0.1:
            if change > 0:
                trend_desc = f"近期 TPS 呈上升趋势，提升了 {change:.1f}，性能表现持续改善。"
            else:
                trend_desc = f"近期 TPS 呈下降趋势，降低了 {abs(change):.1f}，建议关注性能变化。"
        else:
            trend_desc = "近期 TPS 保持稳定，性能波动在合理范围内。"
        insights.append({"icon": "trend", "title": "趋势变化", "description": trend_desc})

    # 3. 稳定性评估 insight
    if sample_count >= 10:
        import statistics
        try:
            tps_std = statistics.stdev(tps_values)
            cv = tps_std / avg_tps if avg_tps else 0
            if cv < 0.2:
                stability_desc = f"TPS 变异系数仅 {cv:.1%}，模型输出非常稳定。"
            elif cv < 0.5:
                stability_desc = f"TPS 变异系数为 {cv:.1%}，模型输出稳定性良好。"
            else:
                stability_desc = f"TPS 变异系数为 {cv:.1%}，模型输出波动较大。"
            insights.append({"icon": "stability", "title": "稳定性评估", "description": stability_desc})
        except statistics.StatisticsError:
            pass

    # 4. 样本充足度 insight
    if sample_count >= 500:
        sample_desc = f"已有 {sample_count} 条实测数据，样本非常充足，数据可信度高。"
    elif sample_count >= 100:
        sample_desc = f"已有 {sample_count} 条实测数据，样本量良好，数据具有参考价值。"
    elif sample_count >= 30:
        sample_desc = f"已有 {sample_count} 条实测数据，样本量一般，建议持续收集。"
    else:
        sample_desc = f"目前仅有 {sample_count} 条实测数据，样本较少，结果仅供参考。"
    insights.append({"icon": "sample", "title": "样本充足度", "description": sample_desc})

    # 限制最多返回 4 条
    return {"insights": insights[:4]}


__all__ = ["get_model_insights"]
