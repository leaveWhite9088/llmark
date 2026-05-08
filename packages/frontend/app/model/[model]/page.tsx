"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft,
  BarChart3,
  Server,
  Database,
  Building2,
  ChevronDown,
} from "lucide-react";

import ProviderComparisonChart from "@/components/model/ProviderComparisonChart";
import ModelPerformanceTable from "@/components/model/ModelPerformanceTable";
import ModelLogo from "@/components/ui/ModelLogo";
import { fetchModelEntries, fetchModelComparison } from "@/lib/api/index";
import type { ModelEntryItem, ModelComparisonResponse } from "@/lib/types";
import { getInputLengthBucketOptions } from "@/lib/inputLength";
import { getRatingScore } from "@/lib/utils";
import { getModelBrand } from "@/constants/brands";

const TIME_RANGES = [
  { value: "24h", label: "24小时" },
  { value: "7d", label: "7天" },
  { value: "30d", label: "30天" },
] as const;

const INPUT_LENGTH_OPTIONS = getInputLengthBucketOptions(undefined, true);

type SortField = "rank" | "provider" | "input_length" | "tps" | "ttft" | "samples" | "rating";
type SortOrder = "asc" | "desc";

export default function ModelPage({ params }: { params: { model: string } }) {
  const router = useRouter();
  const decodedModel = decodeURIComponent(params.model);
  const modelBrand = getModelBrand(decodedModel);

  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");
  const [inputLength, setInputLength] = useState<"" | "short" | "medium" | "long">("");
  const [sortField, setSortField] = useState<SortField>("tps");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { data: apiData, isLoading } = useSWR(
    ["model-entries", decodedModel, selectedProvider, inputLength, timeRange],
    () =>
      fetchModelEntries(decodedModel, {
        provider: selectedProvider || undefined,
        input_length_bucket: inputLength || undefined,
        range: timeRange,
      }),
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const { data: chartData } = useSWR(
    ["model-comparison", decodedModel, inputLength],
    () =>
      fetchModelComparison(decodedModel, {
        input_length_bucket: inputLength || undefined,
      }),
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const entries: ModelEntryItem[] = apiData?.items ?? [];
  const meta = apiData?.meta;

  // provider 筛选已由后端/mock 处理，前端直接使用返回数据
  const filteredData = entries;

  const overview = useMemo(() => {
    const totalSamples = filteredData.reduce((sum, e) => sum + e.sample_count, 0);
    const avgTps =
      filteredData.length > 0
        ? filteredData.reduce((sum, e) => sum + e.avg_tps, 0) / filteredData.length
        : 0;
    const avgTtft =
      filteredData.length > 0
        ? filteredData.reduce((sum, e) => sum + e.avg_ttft_ms, 0) / filteredData.length
        : 0;
    const bestEntry = filteredData.length > 0
      ? filteredData.reduce((best, e) => (e.avg_tps > best.avg_tps ? e : best), filteredData[0])
      : null;
    const uniqueProviders = new Set(filteredData.map((e) => e.provider)).size;

    return {
      totalProviders: uniqueProviders,
      totalSamples,
      avgTps,
      avgTtft,
      bestEntry,
    };
  }, [filteredData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      if (field === "ttft" || field === "input_length" || field === "rank") {
        setSortOrder("asc");
      } else {
        setSortOrder("desc");
      }
    }
  };

  const sortedData = useMemo(() => {
    const data = [...filteredData];
    data.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "tps":
          comparison = a.avg_tps - b.avg_tps;
          break;
        case "ttft":
          comparison = a.avg_ttft_ms - b.avg_ttft_ms;
          break;
        case "samples":
          comparison = a.sample_count - b.sample_count;
          break;
        case "input_length":
          comparison = (a.input_length_bucket || "").localeCompare(
            b.input_length_bucket || ""
          );
          break;
        case "provider":
          comparison = a.provider_name.localeCompare(b.provider_name);
          break;
        case "rating":
          comparison = getRatingScore(a.avg_tps) - getRatingScore(b.avg_tps);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return data;
  }, [filteredData, sortField, sortOrder]);

  const availableFilters = apiData?.available_filters;

  // 概览卡片数据
  const overviewCards: {
    icon: React.ElementType;
    label: string;
    value: string;
    unit?: string;
    subtext: string;
    color: string;
    bgColor: string;
    href?: string;
  }[] = [
    {
      icon: BarChart3,
      label: "平均 TPS",
      value: isLoading ? "--" : overview.avgTps.toFixed(1),
      subtext: "跨厂商均值",
      color: "#34d399",
      bgColor: "rgba(52, 211, 153, 0.08)",
    },
    {
      icon: Server,
      label: "平均 TTFT",
      value: isLoading ? "--" : `${overview.avgTtft.toFixed(0)}`,
      unit: "ms",
      subtext: "跨厂商均值",
      color: "#60a5fa",
      bgColor: "rgba(96, 165, 250, 0.08)",
    },
    {
      icon: Building2,
      label: "最佳厂商",
      value: isLoading ? "--" : overview.bestEntry?.provider_name ?? "--",
      subtext: isLoading
        ? "--"
        : `${overview.bestEntry?.avg_tps.toFixed(1) ?? "--"} TPS`,
      color: "#fbbf24",
      bgColor: "rgba(251, 191, 36, 0.08)",
      href:
        !isLoading && overview.bestEntry
          ? `/provider/${encodeURIComponent(overview.bestEntry.provider)}/model/${encodeURIComponent(decodedModel)}`
          : undefined,
    },
    {
      icon: Database,
      label: "厂商数",
      value: isLoading ? "--" : overview.totalProviders.toString(),
      subtext: `${overview.totalSamples >= 1000 ? `${(overview.totalSamples / 1000).toFixed(1)}k` : overview.totalSamples} 样本`,
      color: "#a78bfa",
      bgColor: "rgba(167, 139, 250, 0.08)",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* ===== 返回按钮 ===== */}
      <button
        onClick={() => router.back()}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-theme-text-muted transition-colors hover:text-theme-text-secondary"
      >
        <ArrowLeft size={16} strokeWidth={2} />
        <span>返回上一级</span>
      </button>

      {/* ===== 模型标题区 ===== */}
      <section className="flex items-center gap-4">
        <ModelLogo model={decodedModel} size={48} />
        <div>
          <h1 className="font-serif text-3xl font-normal italic tracking-wide text-theme-text-primary">
            {decodedModel}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-theme-text-muted">
            <span>{overview.totalProviders} 个厂商</span>
            <span className="text-theme-text-disabled">·</span>
            <span>
              {overview.totalSamples >= 1000
                ? `${(overview.totalSamples / 1000).toFixed(1)}k`
                : overview.totalSamples}{" "}
              样本
            </span>
          </div>
        </div>
      </section>

      {/* ===== 概览卡片 ===== */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          if (card.href) {
            return (
              <Link
                key={card.label}
                href={card.href}
                className="group relative overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-bg-secondary p-4 transition-all hover:border-theme-border-medium hover:bg-theme-bg-tertiary"
              >
                <div
                  className="absolute -right-4 -top-4 h-16 w-16 rounded-full blur-xl opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ backgroundColor: card.color }}
                />
                <div className="relative flex items-start gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: card.bgColor }}
                  >
                    <Icon size={18} style={{ color: card.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-theme-text-muted">{card.label}</p>
                    <div className="mt-0.5 flex items-baseline gap-1">
                      <span className="text-xl font-semibold text-theme-text-primary">
                        {card.value}
                      </span>
                      {card.unit && (
                        <span className="text-sm text-theme-text-muted">{card.unit}</span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-theme-text-disabled">{card.subtext}</p>
                  </div>
                </div>
              </Link>
            );
          }
          return (
            <div
              key={card.label}
              className="group relative overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-bg-secondary p-4 transition-all hover:border-theme-border-medium hover:bg-theme-bg-tertiary"
            >
              <div
                className="absolute -right-4 -top-4 h-16 w-16 rounded-full blur-xl opacity-0 transition-opacity group-hover:opacity-100"
                style={{ backgroundColor: card.color }}
              />
              <div className="relative flex items-start gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: card.bgColor }}
                >
                  <Icon size={18} style={{ color: card.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-theme-text-muted">{card.label}</p>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-xl font-semibold text-theme-text-primary">
                      {card.value}
                    </span>
                    {card.unit && (
                      <span className="text-sm text-theme-text-muted">{card.unit}</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-theme-text-disabled">
                    {card.subtext}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ===== 筛选栏 ===== */}
      <section className="relative z-30 rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-theme-text-muted">时间范围</span>
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-theme-text-muted"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-theme-text-muted">输入长度</span>
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-theme-text-muted"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-theme-text-muted">厂商</span>
            <div className="relative">
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="appearance-none rounded-md border border-theme-border-light bg-theme-bg-primary px-3 py-2 pr-8 text-sm text-theme-text-secondary outline-none transition-colors focus:border-theme-accent-primary/40 focus:ring-1 focus:ring-theme-accent-primary/20"
              >
                <option value="">全部厂商</option>
                {availableFilters?.providers.map((p: string) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-theme-text-muted"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== 性能表格 ===== */}
      <section className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-theme-text-primary">厂商性能对比</h2>
          <p className="mt-0.5 text-xs text-theme-text-muted">各厂商在不同输入长度下的性能表现</p>
        </div>
        <ModelPerformanceTable
          data={sortedData}
          model={decodedModel}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          isLoading={isLoading}
        />
      </section>

      {/* ===== 三列图表区：厂商对比(占2列) + 模型介绍(占1列) ===== */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 左列：厂商性能对比（占2列） */}
        <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm lg:col-span-2">
          <ProviderComparisonChart data={chartData?.data} timeRange={timeRange} />
        </div>

        {/* 右列：模型介绍 */}
        <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-theme-text-primary">
              模型介绍
              {meta && (
                <>
                  <span className="mx-1.5 text-theme-text-disabled font-normal">|</span>
                  <span className="text-sm font-normal text-theme-text-secondary">{meta.display_name}</span>
                </>
              )}
            </h2>
            <p className="mt-0.5 text-xs text-theme-text-muted">该模型的基本信息与能力概览</p>
          </div>

          {meta ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {meta.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md px-2 py-0.5 text-[10px] font-medium text-theme-text-muted bg-theme-bg-overlay-default border border-theme-border-subtle"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-theme-border-subtle bg-theme-bg-secondary p-3">
                  <p className="text-[10px] text-theme-text-disabled">上下文窗口</p>
                  <p className="mt-0.5 text-sm font-medium text-theme-text-secondary">{meta.context_window.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-theme-border-subtle bg-theme-bg-secondary p-3">
                  <p className="text-[10px] text-theme-text-disabled">发布日期</p>
                  <p className="mt-0.5 text-sm font-medium text-theme-text-secondary">{meta.release_date}</p>
                </div>
              </div>

              <p className="text-sm text-theme-text-muted leading-relaxed">
                {meta.description}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
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
              <p className="mt-3 text-sm text-theme-text-muted">暂无模型介绍</p>
            </div>
          )}
        </div>
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
