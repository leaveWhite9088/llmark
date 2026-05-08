"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
  Cell,
} from "recharts";
import { getProviderColor } from "@/constants/brands";

type ProviderData = {
  provider: string;
  name: string;
  avg_tps: number;
  avg_ttft: number;
};

type ComparisonData = {
  "24h": ProviderData[];
  "7d": ProviderData[];
  "30d": ProviderData[];
};

type ProviderComparisonChartProps = {
  data?: ComparisonData;
  timeRange?: "24h" | "7d" | "30d";
};

const TIME_LABELS: Record<string, string> = {
  "24h": "过去 24 小时",
  "7d": "过去 7 天",
  "30d": "过去 30 天",
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ProviderComparisonChart({
  data,
  timeRange,
}: ProviderComparisonChartProps) {
  const [metric, setMetric] = useState<"tps" | "ttft">("tps");

  /* ---- 单时间范围模式：每个厂商三根柱子（24h/7d/30d） ---- */
  const isSingleMode = !!timeRange;

  const singleChartData = useMemo(() => {
    if (!isSingleMode || !data) return [];
    const range24h = data["24h"] || [];
    const range7d = data["7d"] || [];
    const range30d = data["30d"] || [];

    // 以 24h 的厂商顺序为基准
    return range24h.map((p) => {
      const d7 = range7d.find((b) => b.provider === p.provider);
      const d30 = range30d.find((b) => b.provider === p.provider);
      return {
        name: p.name,
        provider: p.provider,
        "24h": metric === "tps" ? p.avg_tps : p.avg_ttft,
        "7d": d7 ? (metric === "tps" ? d7.avg_tps : d7.avg_ttft) : 0,
        "30d": d30 ? (metric === "tps" ? d30.avg_tps : d30.avg_ttft) : 0,
      };
    });
  }, [isSingleMode, data, metric]);

  /* ---- 多时间范围模式（原始模式） ---- */
  const multiChartData = useMemo(() => {
    if (isSingleMode || !data) return [];
    const timeRanges: ("24h" | "7d" | "30d")[] = ["24h", "7d", "30d"];
    return timeRanges.map((range) => {
      const rangeData: Record<string, number | string> = {
        time: TIME_LABELS[range],
        range,
      };
      data[range]?.forEach((provider) => {
        rangeData[provider.provider] =
          metric === "tps" ? provider.avg_tps : provider.avg_ttft;
      });
      return rangeData;
    });
  }, [isSingleMode, data, metric]);

  const providers = useMemo(() => {
    return data?.["24h"]?.map((p) => p.provider) || [];
  }, [data]);

  const chartData = isSingleMode ? singleChartData : multiChartData;

  return (
    <div className="space-y-4">
      {/* 头部标题和指标切换 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-theme-text-primary">
            厂商性能对比
          </h2>
          <p className="mt-0.5 text-xs text-theme-text-muted">
            {isSingleMode
              ? `各厂商在不同时间维度的 ${metric === "tps" ? "TPS" : "TTFT"} 表现`
              : `各厂商在不同时间维度的 ${metric === "tps" ? "TPS" : "TTFT"} 表现`}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-theme-border-subtle bg-theme-bg-quaternary/50 p-1">
          <button
            onClick={() => setMetric("tps")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              metric === "tps"
                ? "bg-theme-bg-secondary text-theme-text-secondary"
                : "text-theme-text-muted hover:text-theme-text-secondary"
            }`}
          >
            TPS
          </button>
          <button
            onClick={() => setMetric("ttft")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              metric === "ttft"
                ? "bg-theme-bg-secondary text-theme-text-secondary"
                : "text-theme-text-muted hover:text-theme-text-secondary"
            }`}
          >
            TTFT
          </button>
        </div>
      </div>

      {/* 图表 */}
      {!data || (!data["24h"]?.length && !data["7d"]?.length && !data["30d"]?.length) ? (
        <div className="flex h-[260px] flex-col items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={32}
            height={32}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="text-theme-text-disabled"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <p className="mt-3 text-sm text-theme-text-muted">暂无数据</p>
          <p className="mt-1 text-xs text-theme-text-disabled">该模型暂无比对数据</p>
        </div>
      ) : (
      <div className={isSingleMode ? "h-[260px]" : "h-[280px]"}>
        <ResponsiveContainer width="100%" height="100%">
          {isSingleMode ? (
            /* 单时间范围：X轴=厂商，每个厂商三根柱子（24h/7d/30d） */
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
              barGap={1}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  metric === "tps" ? value : `${value}ms`
                }
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const p = payload[0]?.payload as any;
                    const h24 = payload.find((x) => x.dataKey === "24h");
                    const h7 = payload.find((x) => x.dataKey === "7d");
                    const h30 = payload.find((x) => x.dataKey === "30d");
                    return (
                      <div className="rounded-lg border border-theme-border-subtle bg-theme-bg-secondary p-3 shadow-xl">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: getProviderColor(p.provider) || "#888",
                            }}
                          />
                          <span className="text-xs font-medium text-theme-text-secondary">
                            {p.name}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {h24 && (
                            <div className="flex items-center justify-between gap-6">
                              <span className="text-xs text-theme-text-muted">过去 24 小时</span>
                              <span className="text-xs font-semibold text-theme-text-primary">
                                {h24.value}
                                {metric === "tps" ? " tps" : " ms"}
                              </span>
                            </div>
                          )}
                          {h7 && (
                            <div className="flex items-center justify-between gap-6">
                              <span className="text-xs text-theme-text-muted">过去 7 天</span>
                              <span className="text-xs font-semibold text-theme-text-primary">
                                {h7.value}
                                {metric === "tps" ? " tps" : " ms"}
                              </span>
                            </div>
                          )}
                          {h30 && (
                            <div className="flex items-center justify-between gap-6">
                              <span className="text-xs text-theme-text-muted">过去 30 天</span>
                              <span className="text-xs font-semibold text-theme-text-primary">
                                {h30.value}
                                {metric === "tps" ? " tps" : " ms"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="24h" radius={[2, 2, 0, 0]} maxBarSize={18}>
                <LabelList
                  dataKey="24h"
                  position="top"
                  formatter={(value: number) =>
                    value ? `${Math.round(value)}${metric === "tps" ? "" : "ms"}` : ""
                  }
                  fill="#94a3b8"
                  fontSize={9}
                  offset={3}
                />
                {singleChartData.map((entry) => (
                  <Cell
                    key={`24h-${entry.provider}`}
                    fill={getProviderColor(entry.provider) || "#888"}
                  />
                ))}
              </Bar>
              <Bar dataKey="7d" radius={[2, 2, 0, 0]} maxBarSize={18}>
                {singleChartData.map((entry) => (
                  <Cell
                    key={`7d-${entry.provider}`}
                    fill={hexToRgba(getProviderColor(entry.provider) || "#888888", 0.65)}
                  />
                ))}
              </Bar>
              <Bar dataKey="30d" radius={[2, 2, 0, 0]} maxBarSize={18}>
                {singleChartData.map((entry) => (
                  <Cell
                    key={`30d-${entry.provider}`}
                    fill={hexToRgba(getProviderColor(entry.provider) || "#888888", 0.35)}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            /* 多时间范围：原始模式 */
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  metric === "tps" ? value : `${value}ms`
                }
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-theme-border-subtle bg-theme-bg-secondary p-3 shadow-xl">
                        <p className="mb-2 text-xs font-medium text-theme-text-secondary">
                          {label}
                        </p>
                        <div className="space-y-1">
                          {payload.map((entry: any) => {
                            if (entry.value == null) return null;
                            return (
                              <div
                                key={entry.dataKey}
                                className="flex items-center gap-2"
                              >
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-xs text-theme-text-muted">
                                  {data?.["24h"]?.find((p) => p.provider === entry.dataKey)
                                    ?.name || entry.dataKey}
                                  :
                                </span>
                                <span className="text-xs font-semibold text-theme-text-primary">
                                  {entry.value}
                                  {metric === "tps" ? " tps" : " ms"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {providers.map((provider) => (
                <Bar
                  key={provider}
                  dataKey={provider}
                  fill={getProviderColor(provider) || "#888"}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={24}
                >
                  <LabelList
                    dataKey={provider}
                    position="top"
                    formatter={(value: number) =>
                      value ? `${Math.round(value)}${metric === "tps" ? "" : "ms"}` : ""
                    }
                    fill="#94a3b8"
                    fontSize={10}
                    offset={4}
                  />
                </Bar>
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      )}

      {/* 单时间范围：文字说明代替图例 */}
      {isSingleMode && data && (data["24h"]?.length || data["7d"]?.length || data["30d"]?.length) && (
        <p className="text-center text-sm text-theme-text-secondary">
          同一厂商内从左到右依次为：24小时、7天、30天
        </p>
      )}

      {/* 多时间范围图例 */}
      {!isSingleMode && (
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          {data?.["24h"]?.map((provider) => (
            <div key={provider.provider} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getProviderColor(provider.provider) || "#888" }}
              />
              <span className="text-xs text-theme-text-muted">{provider.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
