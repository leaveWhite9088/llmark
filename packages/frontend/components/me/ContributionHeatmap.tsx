"use client";

import { useMemo } from "react";
import { format, subDays, startOfWeek, addDays, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { HeatmapItem, HeatmapSummary } from "@/lib/types";

interface ContributionHeatmapProps {
  items: HeatmapItem[];
  summary: HeatmapSummary;
  totalContributions: number;
}

function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 5) return 1;
  if (count <= 15) return 2;
  if (count <= 30) return 3;
  return 4;
}

// 使用 rgba 颜色，避免 opacity 影响整个元素（包括 ring 边框）
const LEVEL_COLORS = [
  "var(--color-bg-quaternary)",
  "rgba(52, 211, 153, 0.5)",
  "rgba(52, 211, 153, 0.7)",
  "rgba(52, 211, 153, 0.85)",
  "rgb(52, 211, 153)",
];

export default function ContributionHeatmap({ items, summary, totalContributions }: ContributionHeatmapProps) {
  const { weeks, months } = useMemo(() => {
    const today = new Date();
    const startDate = subDays(today, 364);
    const startOfFirstWeek = startOfWeek(startDate, { weekStartsOn: 1 });

    const weeksData: { date: Date; count: number }[][] = [];
    const monthsData: { label: string; weekIndex: number }[] = [];

    let currentWeek: { date: Date; count: number }[] = [];
    let currentMonth = "";
    let weekIndex = 0;

    for (let i = 0; i < 371; i++) {
      const date = addDays(startOfFirstWeek, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const item = items.find(d => d.date === dateStr);
      const count = item?.count || 0;

      const monthLabel = format(date, "M月", { locale: zhCN });
      if (monthLabel !== currentMonth && date.getDate() <= 7) {
        monthsData.push({ label: monthLabel, weekIndex });
        currentMonth = monthLabel;
      }

      currentWeek.push({ date, count });

      if (currentWeek.length === 7) {
        weeksData.push(currentWeek);
        currentWeek = [];
        weekIndex++;
      }
    }

    return { weeks: weeksData, months: monthsData };
  }, [items]);

  return (
    <section className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/50 p-5">
      {/* 标题和摘要 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-medium text-theme-text-primary">贡献活动</h2>
        <div className="flex items-center gap-4 text-xs text-theme-text-muted">
          <span>
            本年度 <span className="font-semibold text-theme-text-primary">{totalContributions}</span> 次贡献
          </span>
          {summary.best_day && (
            <span>
              最高单日 <span className="font-semibold text-theme-text-primary">{summary.best_day.count}</span> 条
            </span>
          )}
          <span>
            连续 <span className="font-semibold text-theme-accent-success">{summary.streak_days}</span> 天
          </span>
          {/* 图例 */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-theme-border-subtle/50">
            <span className="text-[10px]">少</span>
            {LEVEL_COLORS.map((color, i) => (
              <div key={i} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
            ))}
            <span className="text-[10px]">多</span>
          </div>
        </div>
      </div>

      {/* 热力图 */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-max ml-8">
          {/* 月份标签 */}
          <div className="mb-1 flex pl-8 text-xs text-theme-text-muted">
            {months.map((m, i) => (
              <div
                key={i}
                className="flex-shrink-0"
                style={{ marginLeft: i === 0 ? m.weekIndex * 12 : (m.weekIndex - months[i - 1].weekIndex) * 12 - 20 }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* 星期标签 + 网格 */}
          <div className="flex">
            <div className="mr-2 flex flex-col gap-[3px] text-[10px] text-theme-text-muted">
              <span className="flex h-3 items-center">一</span>
              <span className="flex h-3 items-center opacity-0">二</span>
              <span className="flex h-3 items-center">三</span>
              <span className="flex h-3 items-center opacity-0">四</span>
              <span className="flex h-3 items-center">五</span>
              <span className="flex h-3 items-center opacity-0">六</span>
              <span className="flex h-3 items-center opacity-0">日</span>
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIndex) => {
                    const level = getLevel(day.count);
                    const isToday = isSameDay(day.date, new Date());

                    const isFirstRow = dayIndex === 0;

                    return (
                      <div
                        key={dayIndex}
                        className={`group/tip relative h-3 w-3 rounded-sm ${
                          isToday ? "ring-1 ring-theme-accent-primary ring-offset-1 ring-offset-theme-bg-secondary" : ""
                        }`}
                        style={{ backgroundColor: LEVEL_COLORS[level] }}
                      >
                        <div className={`pointer-events-none absolute left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap rounded-lg bg-theme-bg-tertiary px-3 py-1.5 text-xs font-medium text-theme-text-primary opacity-0 shadow-theme-lg transition-opacity group-hover/tip:opacity-100 ${
                          isFirstRow ? "top-full mt-2" : "bottom-full mb-2"
                        }`}>
                          {format(day.date, "M月d日", { locale: zhCN })}：{day.count} 条贡献
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
