"use client";

import { TrendingUp, Clock, Database, Layers } from "lucide-react";
import type { LeaderboardItem } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface StatsSummaryProps {
  items: LeaderboardItem[];
}

export default function StatsSummary({ items }: StatsSummaryProps) {
  const hasData = items.length > 0;

  const tpsLeader = hasData
    ? items.reduce((max, d) => d.avg_tps > max.avg_tps ? d : max, items[0])
    : null;
  const ttftLeader = hasData
    ? items.reduce((min, d) => d.avg_ttft_ms < min.avg_ttft_ms ? d : min, items[0])
    : null;
  const totalSamples = hasData
    ? items.reduce((sum, d) => sum + d.sample_count, 0)
    : 0;

  const stats = [
    {
      icon: Layers,
      label: "对比模型",
      value: hasData ? items.length : "--",
      subtext: hasData ? `${new Set(items.map(i => i.provider)).size} 个厂商` : "--",
      color: "#6366f1",
      bgColor: "rgba(99, 102, 241, 0.08)",
    },
    {
      icon: TrendingUp,
      label: "最佳 TPS",
      value: hasData ? tpsLeader!.avg_tps.toFixed(1) : "--",
      subtext: hasData ? `${tpsLeader!.provider} / ${tpsLeader!.model}` : "--",
      color: "#34d399",
      bgColor: "rgba(52, 211, 153, 0.08)",
    },
    {
      icon: Clock,
      label: "最佳 TTFT",
      value: hasData ? `${ttftLeader!.avg_ttft_ms}` : "--",
      unit: "ms",
      subtext: hasData ? `${ttftLeader!.provider} / ${ttftLeader!.model}` : "--",
      color: "#60a5fa",
      bgColor: "rgba(96, 165, 250, 0.08)",
    },
    {
      icon: Database,
      label: "总样本数",
      value: hasData ? formatNumber(totalSamples) : "--",
      subtext: "社区众包测试",
      color: "#a78bfa",
      bgColor: "rgba(167, 139, 250, 0.08)",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-bg-secondary p-4 transition-all hover:border-theme-border-medium hover:bg-theme-bg-tertiary"
          >
            {/* 微光装饰 */}
            <div
              className="absolute -right-4 -top-4 h-16 w-16 rounded-full blur-xl opacity-0 transition-opacity group-hover:opacity-100"
              style={{ backgroundColor: stat.color }}
            />

            <div className="relative flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: stat.bgColor }}
              >
                <Icon size={18} style={{ color: stat.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-theme-text-muted">{stat.label}</p>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-xl font-semibold text-theme-text-primary">
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span className="text-sm text-theme-text-muted">{stat.unit}</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-theme-text-disabled">
                  {stat.subtext}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
