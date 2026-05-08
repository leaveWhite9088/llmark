"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart
} from "recharts";

import type { DetailTrendPoint } from "@/lib/types";

type TrendChartProps = {
  data: DetailTrendPoint[];
  view: "tps" | "ttft";
};

const VIEW_CONFIG = {
  tps: {
    key: "avg_tps",
    color: "#34d399",
    gradientFrom: "rgba(52, 211, 153, 0.5)",
    gradientTo: "rgba(52, 211, 153, 0.08)",
    label: "TPS",
    unit: "tokens/s"
  },
  ttft: {
    key: "avg_ttft_ms",
    color: "#60a5fa",
    gradientFrom: "rgba(96, 165, 250, 0.5)",
    gradientTo: "rgba(96, 165, 250, 0.08)",
    label: "TTFT",
    unit: "ms"
  }
};

export default function TrendChart({ data, view }: TrendChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[320px] flex-col items-center justify-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-theme-text-disabled"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <p className="mt-3 text-sm text-theme-text-muted">暂无趋势数据</p>
        <p className="mt-1 text-xs text-theme-text-disabled">请尝试调整时间范围或筛选条件</p>
      </div>
    );
  }

  const config = VIEW_CONFIG[view];

  const formatted = data.map((item) => ({
    ...item,
    time: new Date(item.time).toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }),
    value: view === "tps" ? item.avg_tps : item.avg_ttft_ms
  }));

  // 计算统计数据
  const values = data.map((d) => (view === "tps" ? d.avg_tps : d.avg_ttft_ms));
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  return (
    <div className="space-y-4">
      {/* 统计摘要 */}
      <div className="flex flex-wrap gap-4">
        <StatItem label="平均" value={avg.toFixed(view === "tps" ? 1 : 0)} unit={config.unit} />
        <StatItem label="最高" value={max.toFixed(view === "tps" ? 1 : 0)} unit={config.unit} />
        <StatItem label="最低" value={min.toFixed(view === "tps" ? 1 : 0)} unit={config.unit} />
        <StatItem label="数据点" value={String(data.length)} unit="个" />
      </div>

      {/* 图表 */}
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${view}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.gradientFrom} />
                <stop offset="100%" stopColor={config.gradientTo} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="4 4"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-theme-border-DEFAULT bg-theme-bg-tertiary p-3 shadow-xl"
                    >
                      <p className="text-xs text-theme-text-muted">{item.time}</p>
                      <p className="mt-1 text-sm font-semibold" style={{ color: config.color }}>
                        {config.label}: {view === "tps" ? item.avg_tps.toFixed(1) : item.avg_ttft_ms.toFixed(0)} {config.unit}
                      </p>
                      {view === "ttft" && item.p99_ttft_ms && (
                        <p className="mt-1 text-xs text-theme-text-muted">
                          P99: {item.p99_ttft_ms.toFixed(0)} ms
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={3}
              fill={`url(#gradient-${view})`}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: config.color }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  unit
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-theme-bg-quaternary/50 px-3 py-2">
      <span className="text-xs text-theme-text-muted">{label}</span>
      <span className="text-sm font-semibold text-theme-text-secondary">
        {value}
        <span className="ml-0.5 text-xs font-normal text-theme-text-disabled">{unit}</span>
      </span>
    </div>
  );
}
