"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ChevronDown,
  ChevronUp,
  Search,
  X,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Building2,
  TrendingUp,
} from "lucide-react";

import { fetchModelsCatalog, fetchModelEntries } from "@/lib/api/index";
import type { ModelCatalogItem, ModelEntryItem } from "@/lib/types";
import ModelLogo from "@/components/ui/ModelLogo";
import ProviderLogo from "@/components/ui/ProviderLogo";
import { formatNumber } from "@/lib/utils";
import { getInputLengthBucketOptions } from "@/lib/inputLength";
import { getProviderBrand } from "@/constants/brands";
import ModelsStatsSummary from "@/components/model/ModelsStatsSummary";

const TIME_RANGES = [
  { value: "24h", label: "24小时" },
  { value: "7d", label: "7天" },
  { value: "30d", label: "30天" },
] as const;

const INPUT_LENGTH_OPTIONS = getInputLengthBucketOptions(undefined, true);

type SortField = "name" | "provider_count" | "avg_tps" | "avg_ttft_ms" | "total_samples" | "best_provider";
type SortOrder = "asc" | "desc";

/* ===== 厂商详情展开行 ===== */
function ModelProvidersDetail({
  model,
  timeRange,
  inputLength,
}: {
  model: string;
  timeRange: "24h" | "7d" | "30d";
  inputLength: "" | "short" | "medium" | "long";
}) {
  const { data: entriesData, isLoading: isLoadingEntries } = useSWR(
    ["model-entries", model, timeRange, inputLength],
    () =>
      fetchModelEntries(model, {
        range: timeRange,
        input_length_bucket: inputLength || undefined,
      }),
    {
      revalidateOnFocus: false,
    }
  );

  return (
    <td colSpan={7} className="px-4 py-4 pl-8">
      {isLoadingEntries ? (
        <div className="flex h-16 items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-theme-border-subtle border-t-theme-accent-primary" />
        </div>
      ) : entriesData?.items.length ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {entriesData.items.map((item) => (
            <ProviderCard key={item.provider} model={model} provider={item} />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-theme-text-muted">暂无数据</p>
      )}
    </td>
  );
}

function ProviderCard({ model, provider }: { model: string; provider: ModelEntryItem }) {
  const brand = getProviderBrand(provider.provider);
  return (
    <Link
      href={`/provider/${provider.provider}/model/${encodeURIComponent(model)}`}
      className="group flex items-center justify-between rounded-lg border border-theme-border-faint bg-theme-bg-overlay-subtlest p-3 transition-all hover:border-theme-border-light hover:bg-theme-bg-overlay-subtle"
    >
      <div className="flex items-center gap-2.5">
        <ProviderLogo provider={provider.provider} size={24} />
        <div>
          <div className="text-sm font-medium text-theme-text-secondary transition-colors group-hover:text-theme-text-primary">
            {brand.name}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                provider.data_quality === "sufficient"
                  ? "bg-theme-accent-success"
                  : "bg-theme-accent-warning/50"
              }`}
            />
            <span className="text-[10px] text-theme-text-disabled">
              {provider.data_quality === "sufficient" ? "数据充足" : "数据有限"}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-theme-accent-success">
          {provider.avg_tps.toFixed(1)}
        </div>
        <div className="text-[10px] text-theme-text-muted">
          {provider.avg_ttft_ms.toFixed(0)}ms
        </div>
      </div>
    </Link>
  );
}

/* ===== 排名徽章 ===== */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return <span className="text-lg font-bold text-theme-accent-warning">1</span>;
  }
  if (rank === 2) {
    return <span className="text-lg font-bold text-theme-text-secondary">2</span>;
  }
  if (rank === 3) {
    return <span className="text-lg font-bold text-theme-accent-warning-light">3</span>;
  }
  return (
    <span className="text-sm font-medium text-theme-text-disabled w-4 text-right">
      {rank}
    </span>
  );
}

/* ===== 表头组件 ===== */
function TableHeader({
  label,
  active,
  order,
  onClick,
  align = "left",
}: {
  label: string;
  active?: boolean;
  order?: "asc" | "desc";
  onClick?: () => void;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={`pb-3 pt-2 text-xs font-medium text-theme-text-muted ${
        onClick ? "cursor-pointer select-none hover:text-theme-text-secondary" : ""
      } ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"}`}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (
          order === "asc" ? (
            <ArrowUp size={12} className="text-theme-accent-primary" />
          ) : (
            <ArrowDown size={12} className="text-theme-accent-primary" />
          )
        )}
      </span>
    </th>
  );
}

const DEFAULT_VISIBLE_COUNT = 10;

export default function ModelsPage() {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");
  const [inputLength, setInputLength] = useState<"" | "short" | "medium" | "long">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("avg_tps");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: catalogData, isLoading: isLoadingCatalog } = useSWR(
    ["models-catalog", timeRange, inputLength, sortField, sortOrder],
    () =>
      fetchModelsCatalog({
        range: timeRange,
        input_length_bucket: inputLength || undefined,
        sort_by:
          sortField === "name"
            ? "name"
            : sortField === "provider_count"
            ? "provider_count"
            : sortField === "avg_tps"
            ? "tps"
            : sortField === "avg_ttft_ms"
            ? "ttft"
            : sortField === "best_provider"
            ? "best_provider"
            : "sample_count",
        sort_order: sortOrder,
      }),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const filteredModels = useMemo(() => {
    if (!catalogData?.items) return [];
    let items = [...catalogData.items];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) => item.model.toLowerCase().includes(query));
    }
    return items;
  }, [catalogData?.items, searchQuery]);

  // 统计摘要数据
  const stats = useMemo(() => {
    if (!catalogData?.items) {
      return { modelCount: 0, providerCount: 0, avgTps: 0, totalSamples: 0 };
    }
    const items = catalogData.items;
    const providerCount = new Set(items.flatMap((i) => [i.best_provider.name])).size;
    const avgTps =
      items.length > 0
        ? items.reduce((sum, i) => sum + i.avg_tps, 0) / items.length
        : 0;
    const totalSamples = items.reduce((sum, i) => sum + i.total_samples, 0);
    return {
      modelCount: items.length,
      providerCount,
      avgTps,
      totalSamples,
    };
  }, [catalogData?.items]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      if (field === "name" || field === "avg_ttft_ms") {
        setSortOrder("asc");
      } else {
        setSortOrder("desc");
      }
    }
  };

  const toggleExpand = (model: string) => {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(model)) {
        next.delete(model);
      } else {
        next.add(model);
      }
      return next;
    });
  };

  const visibleModels = isExpanded
    ? filteredModels
    : filteredModels.slice(0, DEFAULT_VISIBLE_COUNT);
  const hasMore = filteredModels.length > DEFAULT_VISIBLE_COUNT;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* ===== 标题区域 ===== */}
      <section>
        <h1 className="font-serif text-3xl font-normal italic tracking-wide text-theme-text-primary">
          Models
        </h1>
        <p className="mt-1.5 text-sm text-theme-text-muted">
          浏览所有支持的 LLM 模型及其性能表现
        </p>
      </section>

      {/* ===== 统计摘要 ===== */}
      {!isLoadingCatalog && catalogData && (
        <ModelsStatsSummary
          modelCount={stats.modelCount}
          providerCount={stats.providerCount}
          avgTps={stats.avgTps}
          totalSamples={stats.totalSamples}
        />
      )}

      {/* ===== 筛选栏 ===== */}
      <section className="relative z-30 rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* 搜索框 */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索模型..."
              className="w-full rounded-md border border-theme-border-light bg-theme-bg-primary py-2 pl-9 pr-8 text-sm text-theme-text-secondary outline-none transition-colors placeholder:text-theme-text-muted focus:border-theme-accent-primary/40 focus:ring-1 focus:ring-theme-accent-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-theme-text-muted hover:bg-theme-bg-quaternary hover:text-theme-text-secondary"
              >
                <X size={14} />
              </button>
            )}
          </div>

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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-theme-text-muted"
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-theme-text-muted"
            />
          </div>
        </div>
      </section>

      {/* ===== 模型列表 ===== */}
      <section className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-theme-text-primary">模型列表</h2>
          <p className="mt-0.5 text-xs text-theme-text-muted">点击表头排序，展开查看厂商详情</p>
        </div>

        {isLoadingCatalog && !catalogData ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-theme-border-subtle border-t-theme-accent-primary" />
            <span className="ml-3 text-sm text-theme-text-muted">加载中...</span>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
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
            <p className="mt-3 text-sm text-theme-text-muted">未找到模型</p>
            <p className="mt-1 text-xs text-theme-text-disabled">请尝试调整搜索词或筛选条件</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className={`overflow-x-auto${isExpanded ? " max-h-[680px] overflow-y-auto" : ""}`}>
              <table className="w-full min-w-[700px] border-collapse">
                <thead className="sticky top-0 z-10 bg-theme-bg-secondary">
                  <tr className="border-b border-theme-border-subtle">
                  <th className="w-12 pb-3 pt-2 pl-4 text-left text-xs font-medium text-theme-text-muted">#</th>
                  <TableHeader
                    label="模型"
                    active={sortField === "name"}
                    order={sortOrder}
                    onClick={() => handleSort("name")}
                    className="min-w-0"
                  />
                  <TableHeader
                    label="厂商数"
                    active={sortField === "provider_count"}
                    order={sortOrder}
                    onClick={() => handleSort("provider_count")}
                    align="right"
                    className="w-16"
                  />
                  <TableHeader
                    label="平均 TPS"
                    active={sortField === "avg_tps"}
                    order={sortOrder}
                    onClick={() => handleSort("avg_tps")}
                    align="right"
                    className="w-24"
                  />
                  <TableHeader
                    label="平均 TTFT"
                    active={sortField === "avg_ttft_ms"}
                    order={sortOrder}
                    onClick={() => handleSort("avg_ttft_ms")}
                    align="right"
                    className="w-24"
                  />
                  <TableHeader
                    label="样本数"
                    active={sortField === "total_samples"}
                    order={sortOrder}
                    onClick={() => handleSort("total_samples")}
                    align="right"
                    className="w-20"
                  />
                  <TableHeader
                    label="最佳厂商"
                    active={sortField === "best_provider"}
                    order={sortOrder}
                    onClick={() => handleSort("best_provider")}
                    align="right"
                    className="w-28"
                  />
                  <th className="w-14 pb-3 pt-2 pr-4 text-right text-xs font-medium text-theme-text-muted">操作</th>
                </tr>
              </thead>
              <tbody>
                {visibleModels.map((item, index) => {
                  const rank = index + 1;
                  const isRowExpanded = expandedModels.has(item.model);

                  return (
                    <>
                      <tr
                        key={item.model}
                        className="border-b border-theme-border-faint transition-colors hover:bg-theme-bg-overlay-subtlest"
                      >
                        {/* 排名 */}
                        <td className="w-12 py-3 pl-4">
                          <RankBadge rank={rank} />
                        </td>

                        {/* 模型 */}
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <ModelLogo model={item.model} size={28} />
                            <div className="min-w-0">
                              <Link
                                href={`/model/${encodeURIComponent(item.model)}`}
                                className="text-sm font-medium text-theme-text-secondary transition-colors hover:text-theme-accent-primary truncate block"
                                title={item.model}
                              >
                                {item.model}
                              </Link>
                            </div>
                          </div>
                        </td>

                        {/* 厂商数 */}
                        <td className="w-16 py-3 text-right">
                          <span className="text-sm text-theme-text-muted">
                            {item.provider_count}
                          </span>
                        </td>

                        {/* TPS */}
                        <td className="w-24 py-3 text-right">
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              sortField === "avg_tps"
                                ? "text-theme-accent-success"
                                : "text-theme-text-secondary"
                            }`}
                          >
                            {item.avg_tps.toFixed(1)}
                          </span>
                        </td>

                        {/* TTFT */}
                        <td className="w-24 py-3 text-right">
                          <span
                            className={`text-sm tabular-nums ${
                              sortField === "avg_ttft_ms"
                                ? "text-theme-accent-info"
                                : "text-theme-text-muted"
                            }`}
                          >
                            {item.avg_ttft_ms.toFixed(0)}
                          </span>
                          <span className="text-[10px] text-theme-text-disabled">
                            ms
                          </span>
                        </td>

                        {/* 样本数 */}
                        <td className="w-20 py-3 text-right">
                          <span
                            className={`text-xs tabular-nums ${
                              sortField === "total_samples"
                                ? "text-theme-accent-violet"
                                : "text-theme-text-muted"
                            }`}
                          >
                            {formatNumber(item.total_samples)}
                          </span>
                        </td>

                        {/* 最佳厂商 */}
                        <td className="w-28 py-3 text-right">
                          <Link
                            href={`/provider/${item.best_provider.name}/model/${encodeURIComponent(item.model)}`}
                            className="inline-flex items-center gap-1 text-xs text-theme-accent-primary hover:underline transition-colors"
                          >
                            {item.best_provider.display_name}
                          </Link>
                        </td>

                        {/* 操作 */}
                        <td className="w-14 py-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleExpand(item.model)}
                              className="rounded-md p-1.5 text-theme-text-muted transition-colors hover:bg-theme-bg-overlay-subtle hover:text-theme-text-secondary"
                              title={isRowExpanded ? "收起" : "展开厂商详情"}
                            >
                              {isRowExpanded ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                            </button>
                            <Link
                              href={`/model/${encodeURIComponent(item.model)}`}
                              className="rounded-md p-1.5 text-theme-text-muted transition-colors hover:bg-theme-bg-overlay-subtle hover:text-theme-text-secondary"
                              title="查看详情"
                            >
                              <ExternalLink size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* 展开的厂商详情 */}
                      {isRowExpanded && (
                        <tr className="border-b border-theme-border-faint"
                        >
                          <ModelProvidersDetail
                            model={item.model}
                            timeRange={timeRange}
                            inputLength={inputLength}
                          />
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-center gap-2 rounded-xl border border-theme-border-default bg-theme-bg-overlay-subtle py-3 text-sm font-medium text-theme-text-muted transition-all hover:border-theme-border-strong hover:bg-theme-bg-overlay-subtle hover:text-theme-text-secondary"
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={16} />
                  <span>收起列表</span>
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  <span>展开全部</span>
                  <span className="ml-1 rounded-full bg-theme-bg-overlay-default px-2 py-0.5 text-xs text-theme-text-disabled">
                    共 {filteredModels.length} 个
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      )}
      </section>

      {/* ===== 底部导航 ===== */}
      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/providers"
          className="group relative overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm transition-all hover:border-theme-border-DEFAULT hover:bg-theme-bg-secondary"
        >
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-theme-accent-primary">
                <Building2 size={18} />
                <span className="text-xs font-medium uppercase tracking-wider">Providers</span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-theme-text-primary transition-colors group-hover:text-theme-accent-primary">
                浏览所有厂商
              </h3>
              <p className="mt-1 text-sm text-theme-text-muted">
                查看各厂商提供的模型及性能统计数据
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-theme-bg-quaternary/50 text-theme-text-muted transition-colors group-hover:bg-theme-accent-primary group-hover:text-theme-text-primary"
            >
              <ArrowRight size={16} />
            </div>
          </div>
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-theme-accent-primary/5 blur-2xl opacity-50 transition-opacity group-hover:opacity-100" />
        </Link>

        <Link
          href="/"
          className="group relative overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm transition-all hover:border-theme-border-DEFAULT hover:bg-theme-bg-secondary"
        >
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-theme-accent-success">
                <TrendingUp size={18} />
                <span className="text-xs font-medium uppercase tracking-wider">Leaderboard</span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-theme-text-primary transition-colors group-hover:text-theme-accent-success"
              >
                性能排行榜
              </h3>
              <p className="mt-1 text-sm text-theme-text-muted">
                查看各模型厂商组合的综合性能排名
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-theme-bg-quaternary/50 text-theme-text-muted transition-colors group-hover:bg-theme-accent-success group-hover:text-theme-text-primary"
            >
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
