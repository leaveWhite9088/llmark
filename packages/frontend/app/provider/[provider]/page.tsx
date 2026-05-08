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
  Cpu,
  ChevronDown,
} from "lucide-react";

import ProviderLogo from "@/components/ui/ProviderLogo";
import ProviderModelsTable from "@/components/provider/ProviderModelsTable";
import {
  fetchProviderOverview,
  fetchProviderModels,
  fetchModelInfo,
} from "@/lib/api/index";
import type {
  ProviderOverview,
  ProviderModelsResponse,
  ModelInfoResponse,
} from "@/lib/types";
import { getInputLengthBucketOptions } from "@/lib/inputLength";
import { getRatingScore } from "@/lib/utils";
import { getProviderBrand, getProviderColor } from "@/constants/brands";

/* ===== 常量 ===== */
const TIME_RANGES = [
  { value: "24h", label: "24小时" },
  { value: "7d", label: "7天" },
  { value: "30d", label: "30天" },
] as const;

const INPUT_LENGTH_OPTIONS = getInputLengthBucketOptions(undefined, true);

type SortField = "rank" | "model" | "input_length" | "tps" | "ttft" | "samples" | "rating";
type SortOrder = "asc" | "desc";

/* ===== 概览卡片骨架屏 ===== */
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary p-4">
      <div className="mb-2 h-4 w-20 animate-pulse rounded bg-theme-bg-overlay-subtle" />
      <div className="h-8 w-16 animate-pulse rounded bg-theme-bg-overlay-subtle" />
    </div>
  );
}

/* ===== 算力图骨架屏 ===== */
function SkeletonBar() {
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <div className="h-4 w-16 animate-pulse rounded bg-theme-bg-overlay-subtle" />
          <div className="h-4 w-8 animate-pulse rounded bg-theme-bg-overlay-subtle" />
        </div>
        <div className="h-2 w-full rounded-full bg-theme-bg-overlay-subtle">
          <div className="h-2 w-2/3 animate-pulse rounded-full bg-theme-bg-overlay-subtlest" />
        </div>
      </div>
    </div>
  );
}

/* ===== 主页面 ===== */
export default function ProviderPage({ params }: { params: { provider: string } }) {
  const router = useRouter();
  const { provider } = params;
  const brand = getProviderBrand(provider);
  const brandColor = getProviderColor(provider);

  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");
  const [inputLength, setInputLength] = useState<"" | "short" | "medium" | "long">("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("tps");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  /* ---- 数据获取 ---- */
  const { data: overview, isLoading: isLoadingOverview } = useSWR<ProviderOverview>(
    ["provider-overview", provider, range, inputLength],
    () =>
      fetchProviderOverview(provider, {
        range,
        input_length_bucket: inputLength || undefined,
      }),
    { keepPreviousData: true, revalidateOnFocus: false }
  );

  const { data: modelsData, isLoading: isLoadingModels } = useSWR<ProviderModelsResponse>(
    ["provider-models", provider, range, inputLength, selectedModel],
    () =>
      fetchProviderModels(provider, {
        range,
        input_length_bucket: inputLength || undefined,
        model: selectedModel || undefined,
      }),
    { keepPreviousData: true, revalidateOnFocus: false }
  );

  const { data: modelInfoData, isLoading: isLoadingModelInfo } = useSWR<ModelInfoResponse>(
    ["model-info", provider, selectedModel],
    () =>
      fetchModelInfo(provider, {
        model: selectedModel || undefined,
      }),
    { keepPreviousData: true, revalidateOnFocus: false }
  );

  const entries = modelsData?.items ?? [];
  const availableModels = modelsData?.available_filters.models ?? [];

  /* ---- 排序 ---- */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      if (field === "ttft" || field === "input_length") {
        setSortOrder("asc");
      } else {
        setSortOrder("desc");
      }
    }
  };

  const sortedItems = useMemo(() => {
    const items = [...entries];
    items.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "model":
          comparison = a.model.localeCompare(b.model);
          break;
        case "input_length":
          comparison = (a.input_length_bucket || "").localeCompare(b.input_length_bucket || "");
          break;
        case "tps":
          comparison = a.avg_tps - b.avg_tps;
          break;
        case "ttft":
          comparison = a.avg_ttft_ms - b.avg_ttft_ms;
          break;
        case "samples":
          comparison = a.sample_count - b.sample_count;
          break;
        case "rating":
          comparison = getRatingScore(a.avg_tps) - getRatingScore(b.avg_tps);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return items;
  }, [entries, sortField, sortOrder]);

  /* ---- 概览卡片数据 ---- */
  const overviewCards = [
    {
      icon: BarChart3,
      label: "平均 TPS",
      value: isLoadingOverview ? "--" : overview?.overview.avg_tps.toFixed(1) ?? "--",
      subtext: "跨模型均值",
      color: "#34d399",
      bgColor: "rgba(52, 211, 153, 0.08)",
    },
    {
      icon: Server,
      label: "平均 TTFT",
      value: isLoadingOverview ? "--" : overview?.overview.avg_ttft_ms.toFixed(0) ?? "--",
      unit: "ms",
      subtext: "跨模型均值",
      color: "#60a5fa",
      bgColor: "rgba(96, 165, 250, 0.08)",
    },
    {
      icon: Database,
      label: "最佳组合",
      value: isLoadingOverview ? "--" : overview?.overview.best_combo?.model ?? "--",
      subtext: isLoadingOverview
        ? "--"
        : `${overview?.overview.best_combo?.tps.toFixed(1) ?? "--"} TPS`,
      color: "#fbbf24",
      bgColor: "rgba(251, 191, 36, 0.08)",
      href:
        !isLoadingOverview && overview?.overview.best_combo
          ? `/provider/${encodeURIComponent(provider)}/model/${encodeURIComponent(overview.overview.best_combo.model)}`
          : undefined,
    },
    {
      icon: Cpu,
      label: "模型数量",
      value: isLoadingOverview
        ? "--"
        : overview?.overview.total_models?.toString() ?? "--",
      subtext: isLoadingOverview
        ? "--"
        : overview?.overview.total_samples >= 1000
        ? `${(overview.overview.total_samples / 1000).toFixed(1)}k 样本`
        : `${overview?.overview.total_samples ?? "--"} 样本`,
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

      {/* ===== 厂商标题区 ===== */}
      <section className="flex items-center gap-4">
        <ProviderLogo provider={provider} size={48} />
        <div>
          <h1 className="font-serif text-3xl font-normal italic tracking-wide text-theme-text-primary">
            {brand.name}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-theme-text-muted">
            <span>{overview?.overview.total_models ?? "--"} 个模型</span>
            <span className="text-theme-text-disabled">·</span>
            <span>
              {overview?.overview.total_samples >= 1000
                ? `${(overview.overview.total_samples / 1000).toFixed(1)}k`
                : overview?.overview.total_samples ?? "--"}{" "}
              样本
            </span>
          </div>
        </div>
      </section>

      {/* ===== 概览卡片 ===== */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoadingOverview && !overview
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : overviewCards.map((card) => {
              const Icon = card.icon;
              const CardWrapper = card.href ? Link : "div";
              return (
                <CardWrapper
                  key={card.label}
                  {...(card.href ? { href: card.href } : {})}
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
                </CardWrapper>
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
                value={range}
                onChange={(e) => setRange(e.target.value as "24h" | "7d" | "30d")}
                className="appearance-none rounded-md border border-theme-border-light bg-theme-bg-primary px-3 py-2 pr-8 text-sm text-theme-text-secondary outline-none transition-colors focus:border-theme-accent-primary/40 focus:ring-1 focus:ring-theme-accent-primary/20"
              >
                {TIME_RANGES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-theme-text-muted"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-theme-text-muted">模型</span>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="appearance-none rounded-md border border-theme-border-light bg-theme-bg-primary px-3 py-2 pr-8 text-sm text-theme-text-secondary outline-none transition-colors focus:border-theme-accent-primary/40 focus:ring-1 focus:ring-theme-accent-primary/20"
              >
                <option value="">全部模型</option>
                {availableModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
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
          <h2 className="text-base font-semibold text-theme-text-primary">模型性能对比</h2>
          <p className="mt-0.5 text-xs text-theme-text-muted">各模型在不同输入长度下的性能表现</p>
        </div>
        <ProviderModelsTable
          entries={sortedItems}
          provider={provider}
          modelInfoData={modelInfoData}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          isLoading={isLoadingModels}
          hasData={!!modelsData}
        />
      </section>

      {/* ===== 两列图表区：算力分配 + TPS 排名 ===== */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 左列：算力分配 */}
        <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-theme-text-primary">算力分配</h2>
            <p className="mt-0.5 text-xs text-theme-text-muted">该厂商给各模型分配的算力占比（基于TPS）</p>
          </div>

          {isLoadingOverview && !overview ? (
            <div className="space-y-3">
              <SkeletonBar />
              <SkeletonBar />
              <SkeletonBar />
            </div>
          ) : overview?.compute_allocation.length === 0 ? (
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
              <p className="mt-3 text-sm text-theme-text-muted">暂无数据</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overview?.compute_allocation.map((item, index) => {
                const colors = ["#34d399", "#60a5fa", "#fbbf24", "#a78bfa", "#f87171", "#fb923c"];
                const barColor = colors[index % colors.length];
                return (
                  <div key={item.model}>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: barColor }} />
                        <span className="truncate text-sm font-medium text-theme-text-secondary">{item.model}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs text-theme-text-muted">
                          {item.sample_count >= 1000
                            ? `${(item.sample_count / 1000).toFixed(1)}k`
                            : item.sample_count}{" "}
                          样本
                        </span>
                        <span className="text-sm font-semibold text-theme-text-primary tabular-nums">{item.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-theme-bg-overlay-subtle">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 右列：厂商基本信息 */}
        <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-theme-text-primary">
              厂商动态
              {overview?.provider_name && (
                <>
                  <span className="mx-1.5 text-theme-text-disabled font-normal">|</span>
                  <span className="text-sm font-normal text-theme-text-secondary">{overview.provider_name}</span>
                </>
              )}
            </h2>
          </div>

          {isLoadingOverview && !overview ? (
            <div className="space-y-3">
              <SkeletonBar />
              <SkeletonBar />
              <SkeletonBar />
            </div>
          ) : !overview?.policies.length ? (
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
              <p className="mt-3 text-sm text-theme-text-muted">暂时没有信息</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overview.policies.map((policy, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded-lg border border-theme-border-subtle bg-theme-bg-secondary p-3"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-theme-accent-success" />
                  <p className="text-xs text-theme-text-muted leading-relaxed">{policy}</p>
                </div>
              ))}
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
