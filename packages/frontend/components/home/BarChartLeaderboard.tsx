"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  LabelList,
} from "recharts";
import { TrendingUp, Clock, Database, ChevronLeft, ChevronRight } from "lucide-react";
import type { LeaderboardItem } from "@/lib/types";
import { getProviderColor, formatModelName, getProviderBrand } from "@/constants/brands";
import ProviderLogo from "@/components/ui/ProviderLogo";

type MetricType = "tps" | "ttft" | "samples";

type BarChartLeaderboardProps = {
  items: LeaderboardItem[];
};

// 自定义柱顶标签 - 数值
const ValueLabel = (props: any) => {
  const { x, y, width, value } = props;

  return (
    <g>
      {/* 数值标签 */}
      <text
        x={x + width / 2}
        y={y - 6}
        fill="var(--color-text-secondary)"
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
      >
        {value}
      </text>
    </g>
  );
};

// 自定义 X 轴 tick - 显示完整厂商名和模型名
const CustomXAxisTick = (props: any) => {
  const { x, y, payload, data } = props;
  const item = data[payload.index];
  if (!item) return null;

  const brand = getProviderBrand(item.provider);
  // 完整显示模型名，超过25字符截断
  const modelName = item.model;

  return (
    <g transform={`translate(${x},${y})`}>
      {/* Logo - 在柱子正下方 */}
      <foreignObject x={-10} y={8} width={20} height={20}>
        <ProviderLogo provider={item.provider} size={20} />
      </foreignObject>
      {/* 厂商名称 + 模型名称 - 斜着显示（-60度） */}
      <g transform="translate(2, 40) rotate(-60)">
        {/* 厂商名称 - 第一行 */}
        <text
          x={0}
          y={0}
          textAnchor="end"
          fill="var(--color-text-muted)"
          fontSize={10}
          fontWeight={500}
          style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
          {brand.name}
        </text>
        {/* 模型名称 - 第二行，完整显示不截断 */}
        <text
          x={0}
          y={14}
          textAnchor="end"
          fill="var(--color-text-secondary)"
          fontSize={12}
          fontWeight={400}
          style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
          {modelName.length > 25 ? modelName.slice(0, 23) + '..' : modelName}
        </text>
      </g>
    </g>
  );
};

// 将颜色转换为深色主题下的柔和版本
function getDarkThemeColor(color: string): string {
  // 深色主题下使用更柔和、更统一的颜色
  const colorMap: Record<string, string> = {
    "#10A37F": "#34d399", // OpenAI - emerald
    "#D97757": "#fb923c", // Anthropic - orange
    "#4285F4": "#60a5fa", // Google - blue
    "#FA5316": "#f87171", // Mistral - red
    "#D1F366": "#a3e635", // Cohere - lime
    "#4F46E5": "#818cf8", // DeepSeek - indigo
    "#1A1A1A": "#9ca3af", // Kimi - gray
    "#315EFB": "#22d3ee", // GLM - cyan
    "#DC2626": "#f472b6", // MiniMax - pink
    "#FF4D00": "#fb923c", // Baichuan - orange
    "#059669": "#34d399", // 01ai - emerald
    "#0057FF": "#60a5fa", // StepFun - blue
    "#E60012": "#f87171", // iFlytek - red
    "#FF6700": "#fbbf24", // Xiaomi - amber
    "#0061FF": "#38bdf8", // SiliconFlow - sky
    "#6347D9": "#a78bfa", // Coze - violet
    "#155EEF": "#818cf8", // Dify - indigo
    "#10B981": "#34d399", // FastGPT - emerald
    "#22C55E": "#4ade80", // Infinity - green
    "#FF6A00": "#fb923c", // Aliyun - orange
    "#165DFF": "#60a5fa", // Volcengine - blue
    "#2932E1": "#818cf8", // Baidu - indigo
    "#0052D9": "#38bdf8", // Tencent - sky
    "#FF0000": "#f87171", // Huawei - red
    "#D7000F": "#f87171", // CTYun - red
    "#0099FF": "#38bdf8", // CMCC - sky
    "#E1251B": "#f87171", // JDCloud - red
  };
  return colorMap[color] || "#818cf8";
}

export default function BarChartLeaderboard({
  items,
}: BarChartLeaderboardProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>("tps");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 使用 useMemo 缓存 chartData，避免不必要的重新渲染
  const chartData = useMemo(() => {
    // 空数据检查移到 useMemo 内部
    if (!items.length) return [];

    let sortedItems;

    switch (activeMetric) {
      case "tps":
        sortedItems = [...items].sort((a, b) => b.avg_tps - a.avg_tps);
        break;
      case "ttft":
        sortedItems = [...items].sort((a, b) => a.avg_ttft_ms - b.avg_ttft_ms);
        break;
      case "samples":
        sortedItems = [...items].sort((a, b) => b.sample_count - a.sample_count);
        break;
      default:
        sortedItems = items;
    }

    return sortedItems.map((item) => ({
      name: formatModelName(item.provider, item.model),
      shortName: item.model,
      fullName: formatModelName(item.provider, item.model),
      provider: item.provider,
      model: item.model,
      value:
        activeMetric === "tps"
          ? Number(item.avg_tps.toFixed(1))
          : activeMetric === "ttft"
          ? Number(item.avg_ttft_ms.toFixed(0))
          : item.sample_count,
      color: getDarkThemeColor(getProviderColor(item.provider)),
      unit:
        activeMetric === "tps"
          ? "tokens/s"
          : activeMetric === "ttft"
          ? "ms"
          : "samples",
    }));
  }, [items, activeMetric]);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScroll);
      return () => container.removeEventListener("scroll", checkScroll);
    }
  }, [chartData]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const metrics = [
    {
      key: "tps" as MetricType,
      label: "输出速度",
      subtitle: "Tokens per Second",
      icon: TrendingUp,
      color: "#34d399",
      description: "每秒生成的 token 数量，数值越高速度越快",
    },
    {
      key: "ttft" as MetricType,
      label: "首字延迟",
      subtitle: "Time to First Token",
      icon: Clock,
      color: "#60a5fa",
      description: "从请求到首个 token 返回的时间，数值越低越好",
    },
    {
      key: "samples" as MetricType,
      label: "样本量",
      subtitle: "Sample Count",
      icon: Database,
      color: "#a78bfa",
      description: "统计样本数量，数量越多数据越可靠",
    },
  ];

  const activeMetricConfig = metrics.find((m) => m.key === activeMetric)!;

  // 缓存 CustomTooltip，避免每次渲染都创建新函数
  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-theme-border-default bg-theme-bg-quaternary p-4 shadow-2xl shadow-theme-bg-primary/50">
          <div className="flex items-center gap-2">
            <ProviderLogo provider={data.provider} size={20} />
            <span className="text-sm font-medium text-theme-text-secondary">{data.fullName}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-theme-text-primary">{data.value}</span>
            <span className="text-xs text-theme-text-muted">{data.unit}</span>
          </div>
        </div>
      );
    }
    return null;
  }, []);

  // 图表配置 - 使用固定最小宽度确保一致性
  const MIN_BAR_WIDTH = 60;
  const MIN_CHART_WIDTH = 800;

  // 计算图表宽度：确保至少占满容器，且每个柱子有足够空间
  const calculateChartWidth = (dataLength: number) => {
    const requiredWidth = dataLength * MIN_BAR_WIDTH;
    return Math.max(MIN_CHART_WIDTH, requiredWidth);
  };

  if (!items.length) {
    return (
      <div className="flex flex-col rounded-3xl border border-theme-border-subtle">
        <div className="border-b border-theme-border-subtle p-6">
          <h2 className="text-lg font-semibold text-theme-text-primary">性能排行</h2>
          <p className="mt-1 text-xs text-theme-text-muted">TOP 模型排行榜</p>
        </div>
        <div className="flex h-[320px] flex-col items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={24}
            height={24}
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
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-theme-border-subtle bg-gradient-to-b from-theme-bg-secondary to-theme-bg-primary shadow-md shadow-theme-bg-primary/10">
      {/* 头部 */}
      <div className="border-b border-theme-border-subtle p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-theme-text-primary">性能排行</h2>
            <p className="mt-1 text-xs text-theme-text-muted">TOP 模型排行榜</p>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-theme-border-default bg-theme-bg-overlay-subtle p-1">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              const isActive = activeMetric === metric.key;

              return (
                <button
                  key={metric.key}
                  onClick={() => setActiveMetric(metric.key)}
                  className={`
                    flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all
                    ${isActive
                      ? "bg-theme-bg-overlay-default text-theme-text-primary shadow-lg"
                      : "text-theme-text-muted hover:text-theme-text-secondary"
                    }
                  `}
                >
                  <Icon size={14} style={{ color: isActive ? metric.color : undefined }} />
                  <span>{metric.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 当前指标说明 */}
        <div className="mt-4 flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${activeMetricConfig.color}20` }}
          >
            {(() => {
              const Icon = activeMetricConfig.icon;
              return <Icon size={16} style={{ color: activeMetricConfig.color }} />;
            })()}
          </div>
          <div>
            <p className="text-sm font-medium text-theme-text-secondary">{activeMetricConfig.label}</p>
            <p className="text-xs text-theme-text-muted">{activeMetricConfig.description}</p>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      {chartData.length > 0 ? (
        <div className="relative">
          {/* 滚动按钮 */}
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-theme-border-default bg-theme-bg-quaternary/90 p-2 text-theme-text-tertiary shadow-lg backdrop-blur-sm transition-all hover:text-theme-text-primary"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-theme-border-default bg-theme-bg-quaternary/90 p-2 text-theme-text-tertiary shadow-lg backdrop-blur-sm transition-all hover:text-theme-text-primary"
            >
              <ChevronRight size={20} />
            </button>
          )}

          {/* 渐变遮罩 */}
          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-theme-bg-primary to-transparent" />
          )}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-theme-bg-primary to-transparent" />
          )}

          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-thin"
          >
            <div
              style={{
                width: calculateChartWidth(chartData.length),
                minWidth: "100%",
                transition: "width 0.3s ease-out"
              }}
            >
              <div className="h-[540px] px-2 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 30, right: 8, left: 8, bottom: 130 }}
                    barCategoryGap="15%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-subtle)"
                      vertical={false}
                      horizontal={true}
                    />
                    <XAxis
                      dataKey="name"
                      xAxisId="0"
                      hide
                    />
                    <XAxis
                      dataKey="name"
                      xAxisId="1"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tick={(props) => <CustomXAxisTick {...props} data={chartData} />}
                      height={120}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-bg-overlay-subtlest)" }} />
                    <Bar
                      dataKey="value"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={40}
                      animationDuration={500}
                      animationEasing="ease-out"
                    >
                      {/* 柱顶标签 - 数值 */}
                      <LabelList
                        dataKey="value"
                        content={(props: any) => (
                          <ValueLabel {...props} />
                        )}
                      />
                      {chartData.map((entry) => (
                        <Cell
                          key={`${entry.provider}-${entry.model}`}
                          fill={entry.color}
                          fillOpacity={0.9}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-[480px] flex-col items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={24}
            height={24}
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
        </div>
      )}
    </div>
  );
}
