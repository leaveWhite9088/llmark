"use client";

import { Building2, Layers, TrendingUp, Database } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface ProvidersStatsSummaryProps {
  providerCount: number;
  modelCount: number;
  avgTps: number;
  totalSamples: number;
}

export default function ProvidersStatsSummary({
  providerCount,
  modelCount,
  avgTps,
  totalSamples,
}: ProvidersStatsSummaryProps) {
  const stats = [
    {
      icon: Building2,
      label: "厂商总数",
      value: providerCount,
      subtext: "接入平台",
      color: "#6366f1",
      bgColor: "rgba(99, 102, 241, 0.08)",
    },
    {
      icon: Layers,
      label: "覆盖模型",
      value: modelCount,
      subtext: "跨厂商总数",
      color: "#60a5fa",
      bgColor: "rgba(96, 165, 250, 0.08)",
    },
    {
      icon: TrendingUp,
      label: "平均 TPS",
      value: avgTps.toFixed(1),
      subtext: "跨厂商均值",
      color: "#34d399",
      bgColor: "rgba(52, 211, 153, 0.08)",
    },
    {
      icon: Database,
      label: "总样本数",
      value: formatNumber(totalSamples),
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
