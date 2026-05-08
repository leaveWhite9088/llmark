"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  Clock,
  Database,
  Activity,
  ChevronDown,
  ArrowRight,
  Cpu,
  Lightbulb,
  BarChart3,
  Zap,
  Gauge,
  Sparkles,
} from "lucide-react";
import useSWR from "swr";

import TrendChart from "@/components/provider-model/TrendChart";
import { fetchDetail } from "@/lib/api/index";
import { fetchModelInsights } from "@/lib/api/models";
import { getProviderBrand } from "@/constants/brands";
import ProviderLogo from "@/components/ui/ProviderLogo";
import { getInputLengthBucketOptions, getInputLengthBucketLabel } from "@/lib/inputLength";
import { formatNumber } from "@/lib/utils";

const TIME_RANGES = [
  { value: "24h", label: "24小时" },
  { value: "7d", label: "7天" },
  { value: "30d", label: "30天" },
] as const;

const INPUT_LENGTH_OPTIONS = getInputLengthBucketOptions(undefined, true);


const INSIGHT_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  speed: Zap,
  trend: TrendingUp,
  stability: Activity,
  sample: Database,
};

type DetailPageProps = {
  params: {
    provider: string;
    model: string;
  };
};

export default function ProviderModelDetailPage({ params }: DetailPageProps) {
  const { provider, model } = params;
  const decodedModel = decodeURIComponent(model);
  const brand = getProviderBrand(provider);
  const router = useRouter();

  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");
  const [inputLength, setInputLength] = useState<"" | "short" | "medium" | "long">("");
  const [chartView, setChartView] = useState<"tps" | "ttft">("tps");

  // 主数据：趋势
  const { data, isLoading, isValidating } = useSWR(
    ["provider-model-detail", provider, decodedModel, timeRange, inputLength],
    () =>
      fetchDetail({
        provider,
        model: decodedModel,
        range: timeRange,
        input_length_bucket: inputLength || undefined,
      }),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  // 数据洞察
  const { data: insightsData, isLoading: insightsLoading } = useSWR(
    ["model-insights", provider, decodedModel],
    () => fetchModelInsights(decodedModel, provider),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  // 输入长度分布数据
  const { data: inputLengthData, isLoading: inputLengthLoading } = useSWR(
    ["detail-input-lengths", provider, decodedModel, timeRange],
    async () => {
      const buckets: Array<"short" | "medium" | "long"> = ["short", "medium", "long"];
      const results = await Promise.all(
        buckets.map(async (bucket) => {
          try {
            const result = await fetchDetail({
              provider,
              model: decodedModel,
              range: timeRange,
              input_length_bucket: bucket,
            });
            if (!result.trend.length) return null;
            const avgTps = result.trend.reduce((sum, d) => sum + d.avg_tps, 0) / result.trend.length;
            const avgTtft = result.trend.reduce((sum, d) => sum + d.avg_ttft_ms, 0) / result.trend.length;
            return {
              bucket,
              avg_tps: Number(avgTps.toFixed(1)),
              avg_ttft_ms: Math.floor(avgTtft),
              sample_count: result.sample_count ?? result.trend.length,
            };
          } catch {
            return null;
          }
        })
      );
      return results.filter((r): r is NonNullable<typeof r> => r !== null);
    },
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  // 核心指标
  const metrics = useMemo(() => {
    if (!data?.trend?.length) return null;
    const avgTps = data.trend.reduce((sum, d) => sum + d.avg_tps, 0) / data.trend.length;
    const avgTtft = data.trend.reduce((sum, d) => sum + d.avg_ttft_ms, 0) / data.trend.length;
    const totalSamples = data.sample_count ?? data.trend.length;
    return { avgTps, avgTtft, totalSamples };
  }, [data]);

  const isInitialLoading = isLoading && !data;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* ===== 返回按钮 ===== */}
      <button
        onClick={() => router.back()}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-theme-text-muted transition-colors hover:text-theme-text-secondary"
      >
        <ArrowLeft size={16} strokeWidth={2} />
        <span>返回</span>
      </button>

      {/* ===== 标题区 ===== */}
      <section className="flex items-start gap-4">
        <ProviderLogo provider={provider} size={48} />
        <div className="min-w-0">
          <div className="text-sm text-theme-text-muted">{brand.name}</div>
          <h1 className="font-serif text-3xl font-normal italic tracking-wide text-theme-text-primary">
            {brand.name} / {decodedModel}
          </h1>
          <p className="mt-1 text-xs text-theme-text-muted">
            数据来源于社区众包测试 · 仅供参考
          </p>
        </div>
      </section>

      {/* ===== 筛选栏 ===== */}
      <section className="relative z-30 rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* 时间范围 */}
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as "24h" | "7d" | "30d")}
              className="appearance-none rounded-md border border-theme-border-light bg-theme-bg-primary px-3 py-2 pr-8 text-sm text-theme-text-secondary outline-none transition-colors focus:border-theme-accent-primary/40 focus:ring-1 focus:ring-theme-accent-primary/20"
            >
              {TIME_RANGES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted"
            />
          </div>

          {/* 输入长度 */}
          <div className="relative">
            <select
              value={inputLength}
              onChange={(e) =>
                setInputLength(e.target.value as "" | "short" | "medium" | "long")
              }
              className="appearance-none rounded-md border border-theme-border-light bg-theme-bg-primary px-3 py-2 pr-8 text-sm text-theme-text-secondary outline-none transition-colors focus:border-theme-accent-primary/40 focus:ring-1 focus:ring-theme-accent-primary/20"
            >
              {INPUT_LENGTH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted"
            />
          </div>

          {isValidating && !!data && (
            <div className="flex animate-pulse items-center gap-2 text-xs text-theme-accent-success">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-theme-accent-success/30 border-t-theme-accent-success" />
              <span>更新中...</span>
            </div>
          )}
        </div>
      </section>

      {/* ===== 核心指标卡片 ===== */}
      {metrics && (
        <section className="grid grid-cols-3 gap-3">
          <div className="group relative overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-bg-secondary p-4 transition-all hover:border-theme-border-medium hover:bg-theme-bg-tertiary">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-theme-accent-success/5 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-theme-accent-success/[0.08]">
                <TrendingUp size={18} className="text-theme-accent-success" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-theme-text-muted">平均 TPS</p>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-xl font-semibold text-theme-text-primary">
                    {metrics.avgTps.toFixed(1)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-theme-text-disabled">tokens/s</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-bg-secondary p-4 transition-all hover:border-theme-border-medium hover:bg-theme-bg-tertiary">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-theme-accent-info/5 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-theme-accent-info/[0.08]">
                <Clock size={18} className="text-theme-accent-info" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-theme-text-muted">平均 TTFT</p>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-xl font-semibold text-theme-text-primary">
                    {metrics.avgTtft.toFixed(0)}
                  </span>
                  <span className="text-sm text-theme-text-muted">ms</span>
                </div>
                <p className="mt-0.5 text-xs text-theme-text-disabled">首字延迟</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-bg-secondary p-4 transition-all hover:border-theme-border-medium hover:bg-theme-bg-tertiary">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-theme-accent-violet/5 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-theme-accent-violet/[0.08]">
                <Database size={18} className="text-theme-accent-violet" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-theme-text-muted">样本数</p>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-xl font-semibold text-theme-text-primary">
                    {metrics.totalSamples >= 1000
                      ? `${(metrics.totalSamples / 1000).toFixed(1)}k`
                      : metrics.totalSamples}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-theme-text-disabled">社区众包测试</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== 趋势图表 ===== */}
      <section className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-theme-bg-quaternary/50">
              <Activity size={18} className="text-theme-accent-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-theme-text-primary">性能趋势</h2>
              <p className="text-xs text-theme-text-muted">
                {chartView === "tps" ? "输出速度随时间变化" : "首字延迟随时间变化"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-theme-border-light bg-theme-bg-primary p-1">
            <button
              onClick={() => setChartView("tps")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                chartView === "tps"
                  ? "bg-theme-bg-quaternary text-theme-text-primary"
                  : "text-theme-text-muted hover:text-theme-text-secondary"
              }`}
            >
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-theme-accent-success" />
              TPS
            </button>
            <button
              onClick={() => setChartView("ttft")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                chartView === "ttft"
                  ? "bg-theme-bg-quaternary text-theme-text-primary"
                  : "text-theme-text-muted hover:text-theme-text-secondary"
              }`}
            >
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-theme-accent-info" />
              TTFT
            </button>
          </div>
        </div>

        <div className={`transition-opacity duration-200 ${isValidating ? "opacity-60" : "opacity-100"}`}>
          {isInitialLoading ? (
            <div className="flex h-[320px] items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-theme-border-subtle border-t-theme-accent-primary" />
              <span className="ml-3 text-sm text-theme-text-muted">加载中...</span>
            </div>
          ) : !data?.trend?.length ? (
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
              <p className="mt-3 text-sm text-theme-text-muted">暂无趋势数据</p>
              <p className="mt-1 text-xs text-theme-text-disabled">请尝试调整筛选条件</p>
            </div>
          ) : (
            <TrendChart data={data.trend} view={chartView} />
          )}
        </div>
      </section>

      {/* ===== 两列：长短文本分布 + 数据洞察 ===== */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* 左列：长短文本分布 */}
        <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-theme-bg-quaternary/50">
              <Gauge size={18} className="text-theme-accent-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-theme-text-primary">长短文本分布</h2>
              <p className="text-xs text-theme-text-muted">不同输入长度下的性能表现</p>
            </div>
          </div>

          {inputLengthLoading && !inputLengthData ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-theme-border-subtle border-t-theme-accent-primary" />
            </div>
          ) : !inputLengthData?.length ? (
            <div className="flex h-32 flex-col items-center justify-center">
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-theme-border-subtle">
                    <th className="pb-3 pt-2 text-left text-xs font-medium text-theme-text-muted">
                      输入长度
                    </th>
                    <th className="pb-3 pt-2 text-right text-xs font-medium text-theme-text-muted">
                      TPS
                    </th>
                    <th className="pb-3 pt-2 text-right text-xs font-medium text-theme-text-muted">
                      TTFT
                    </th>
                    <th className="pb-3 pt-2 text-right text-xs font-medium text-theme-text-muted">
                      样本
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inputLengthData.map((item) => (
                    <tr
                      key={item.bucket}
                      className="border-b border-theme-border-faint transition-colors hover:bg-theme-bg-overlay-subtlest"
                    >
                      <td className="py-3">
                        <span className="text-sm font-medium text-theme-text-secondary">
                          {getInputLengthBucketLabel(item.bucket, undefined, item.bucket)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-sm font-semibold tabular-nums text-theme-text-secondary">
                          {item.avg_tps.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-sm tabular-nums text-theme-text-muted">
                          {item.avg_ttft_ms.toFixed(0)}
                        </span>
                        <span className="text-[10px] text-theme-text-disabled">ms</span>
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-xs tabular-nums text-theme-text-muted">
                          {formatNumber(item.sample_count)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 右列：数据洞察 */}
        <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-theme-bg-quaternary/50">
              <Lightbulb size={18} className="text-theme-accent-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-theme-text-primary">数据洞察</h2>
              <p className="text-xs text-theme-text-muted">基于当前数据的自动分析</p>
            </div>
          </div>

          {insightsLoading && !insightsData ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-theme-border-subtle border-t-theme-accent-primary" />
            </div>
          ) : !insightsData?.insights?.length ? (
            <div className="flex h-40 flex-col items-center justify-center">
              <Sparkles size={32} className="text-theme-text-disabled" />
              <p className="mt-3 text-sm text-theme-text-muted">数据洞察即将推出</p>
              <p className="mt-1 text-xs text-theme-text-disabled">基于 AI 的自动分析功能正在开发中</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insightsData.insights.map((insight, index) => {
                const IconComp = INSIGHT_ICONS[insight.icon] || Sparkles;
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-lg border border-theme-border-faint bg-theme-bg-overlay-subtlest p-3 transition-colors hover:bg-theme-bg-overlay-subtle"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-theme-bg-quaternary/50">
                      <IconComp size={16} className="text-theme-accent-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-theme-text-secondary">
                        {insight.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-theme-text-muted">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== 性能分析预留区块 ===== */}
      <section className="flex h-48 flex-col items-center justify-center rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80">
        <BarChart3 size={40} className="text-theme-text-disabled" />
        <p className="mt-4 text-sm font-medium text-theme-text-muted">性能分析即将推出</p>
        <p className="mt-1 text-xs text-theme-text-disabled">更深入的模型性能对比与分析功能正在开发中</p>
      </section>

      {/* ===== 底部导航 ===== */}
      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href={`/model/${encodeURIComponent(decodedModel)}`}
          className="group relative overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm transition-all hover:border-theme-border-DEFAULT hover:bg-theme-bg-secondary"
        >
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-theme-accent-primary">
                <Cpu size={18} />
                <span className="text-xs font-medium uppercase tracking-wider">Model</span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-theme-text-primary transition-colors group-hover:text-theme-accent-primary">
                {decodedModel}
              </h3>
              <p className="mt-1 text-sm text-theme-text-muted">查看该模型在所有厂商下的表现</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-theme-bg-quaternary/50 text-theme-text-muted transition-colors group-hover:bg-theme-accent-primary group-hover:text-theme-text-primary">
              <ArrowRight size={16} />
            </div>
          </div>
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-theme-accent-primary/5 blur-2xl opacity-50 transition-opacity group-hover:opacity-100" />
        </Link>

        <Link
          href={`/provider/${provider}`}
          className="group relative overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm transition-all hover:border-theme-border-DEFAULT hover:bg-theme-bg-secondary"
        >
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-theme-accent-success">
                <TrendingUp size={18} />
                <span className="text-xs font-medium uppercase tracking-wider">Provider</span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-theme-text-primary transition-colors group-hover:text-theme-accent-success">
                {brand.name}
              </h3>
              <p className="mt-1 text-sm text-theme-text-muted">查看该厂商下所有模型的表现</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-theme-bg-quaternary/50 text-theme-text-muted transition-colors group-hover:bg-theme-accent-success group-hover:text-theme-text-primary">
              <ArrowRight size={16} />
            </div>
          </div>
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-theme-accent-success/5 blur-2xl opacity-50 transition-opacity group-hover:opacity-100" />
        </Link>
      </section>

      {/* ===== 页脚 ===== */}
      <footer className="border-t border-theme-border-subtle pt-6 pb-8 text-center text-xs text-theme-text-disabled">
        <p>数据来源于社区众包测试 · 仅供参考</p>
        <a
          href="https://github.com/leaveWhite9088/llmark/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block border-b border-theme-border-default text-theme-text-muted transition-colors hover:border-theme-accent-primary hover:text-theme-accent-primary"
        >
          有问题联系我
        </a>
      </footer>
    </div>
  );
}
