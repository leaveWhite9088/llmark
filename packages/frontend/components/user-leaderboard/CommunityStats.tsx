"use client";

import { Users, BarChart3, Cpu, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface CommunityStatsProps {
  totalContributors: number;
  totalContributions: number;
  modelsCovered: number;
  contributionsToday: number;
  contributorsTrend?: number;
  contributionsTrend?: number;
  modelsTrend?: number;
  todayTrend?: number;
}

function TrendBadge({ value }: { value?: number }) {
  if (value === undefined || value === 0) return null;
  const isPositive = value > 0;
  return (
    <span
      className={`inline-flex items-center text-[10px] font-medium ${
        isPositive ? "text-theme-accent-success" : "text-theme-accent-danger"
      }`}
    >
      {isPositive ? "↑" : "↓"}
      {Math.abs(value)}
    </span>
  );
}

export default function CommunityStats({
  totalContributors,
  totalContributions,
  modelsCovered,
  contributionsToday,
  contributorsTrend,
  contributionsTrend,
  modelsTrend,
  todayTrend,
}: CommunityStatsProps) {
  const stats = [
    {
      icon: Users,
      label: "总贡献者",
      value: formatNumber(totalContributors),
      trend: contributorsTrend,
    },
    {
      icon: BarChart3,
      label: "总贡献次数",
      value: formatNumber(totalContributions),
      trend: contributionsTrend,
    },
    {
      icon: Cpu,
      label: "覆盖模型数",
      value: formatNumber(modelsCovered),
      trend: modelsTrend,
    },
    {
      icon: TrendingUp,
      label: "今日新增",
      value: formatNumber(contributionsToday),
      trend: todayTrend,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group relative overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-bg-quaternary/20 p-4 transition-all hover:border-theme-border-medium hover:bg-theme-bg-quaternary/40"
        >
          <div className="flex items-center gap-2">
            <stat.icon className="h-4 w-4 text-theme-text-muted" />
            <span className="text-sm text-theme-text-muted">{stat.label}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-theme-text-secondary">
              {stat.value}
            </span>
            <TrendBadge value={stat.trend} />
          </div>
        </div>
      ))}
    </div>
  );
}
