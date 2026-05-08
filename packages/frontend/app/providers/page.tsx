"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ArrowRight,
  Package,
  TrendingUp,
} from "lucide-react";

import { fetchProvidersCatalog } from "@/lib/api/index";
import ProviderLogo from "@/components/ui/ProviderLogo";
import type { ProviderCatalogItem } from "@/lib/types";
import { getInputLengthBucketOptions } from "@/lib/inputLength";
import { formatNumber } from "@/lib/utils";
import ProvidersStatsSummary from "@/components/provider/ProvidersStatsSummary";

const TIME_RANGES = [
  { value: "24h", label: "24小时" },
  { value: "7d", label: "7天" },
  { value: "30d", label: "30天" },
] as const;

const INPUT_LENGTH_OPTIONS = getInputLengthBucketOptions(undefined, true);

const DEFAULT_VISIBLE_COUNT = 10;

type SortField = "model_count" | "avg_tps" | "avg_ttft_ms" | "total_samples";
type SortOrder = "asc" | "desc";

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
    <span className="w-4 text-right text-sm font-medium text-theme-text-disabled">
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
  className = "",
}: {
  label: string;
  active?: boolean;
  order?: "asc" | "desc";
  onClick?: () => void;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={`pb-3 pt-2 text-xs font-medium text-theme-text-muted ${
        onClick ? "cursor-pointer select-none hover:text-theme-text-secondary" : ""
      } ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${className}`}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active &&
          (order === "asc" ? (
            <ArrowUp size={12} className="text-theme-accent-primary" />
          ) : (
            <ArrowDown size={12} className="text-theme-accent-primary" />
          ))}
      </span>
    </th>
  );
}

/* ===== 厂商模型展开行（极简预览） ===== */
function ProviderTopModelsDetail({
  provider,
  topModels,
}: {
  provider: string;
  topModels: ProviderCatalogItem["top_models"];
}) {
  return (
    <td colSpan={8} className="px-4 py-3">
      <div className="flex flex-col gap-1.5">
        {topModels.map((model) => (
          <Link
            key={model.name}
            href={`/provider/${provider}/model/${encodeURIComponent(model.name)}`}
            className="group flex items-center justify-between rounded-md px-8 py-1.5 transition-colors hover:bg-theme-bg-overlay-subtlest"
          >
            <span className="text-sm text-theme-text-secondary transition-colors group-hover:text-theme-accent-primary">
              {model.name}
            </span>
            <span className="flex items-center gap-2 text-xs text-theme-text-muted">
              <span className="tabular-nums">{model.avg_tps.toFixed(1)} TPS</span>
              <span className="text-theme-text-disabled">·</span>
              <span className="tabular-nums">{model.avg_ttft_ms.toFixed(0)}ms</span>
              <span className="text-theme-text-disabled">·</span>
              <span className="tabular-nums">{formatNumber(model.sample_count)} 样本</span>
            </span>
          </Link>
        ))}
      </div>
    </td>
  );
}

export default function ProvidersPage() {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");
  const [inputLength, setInputLength] = useState<"" | "short" | "medium" | "long">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("avg_tps");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  // 使用 ref 保存滚动位置
  const scrollPositionRef = useRef<number>(0);
  const isFilterChangingRef = useRef<boolean>(false);

  const { data: catalogData, isLoading, isValidating } = useSWR(
    ["providers-catalog", timeRange, inputLength],
    () =>
      fetchProvidersCatalog({
        range: timeRange,
        input_length_bucket: inputLength || undefined,
      }),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  // 在数据验证完成时恢复滚动位置
  useEffect(() => {
    if (!isValidating && isFilterChangingRef.current) {
      isFilterChangingRef.current = false;
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPositionRef.current, behavior: "auto" });
      });
    }
  }, [isValidating]);

  // 处理筛选变化的通用函数
  const handleFilterChange = useCallback(
    <T,>(setter: (value: T) => void, value: T) => {
      scrollPositionRef.current = window.scrollY;
      isFilterChangingRef.current = true;
      setter(value);
    },
    []
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      if (field === "avg_ttft_ms") {
        setSortOrder("asc");
      } else {
        setSortOrder("desc");
      }
    }
  };

  const toggleExpand = (provider: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) {
        next.delete(provider);
      } else {
        next.add(provider);
      }
      return next;
    });
  };

  const filteredProviders = useMemo(() => {
    if (!catalogData?.items) return [];
    let items = [...catalogData.items];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.provider.toLowerCase().includes(query)
      );
    }
    // 前端排序
    items.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return items;
  }, [catalogData?.items, searchQuery, sortField, sortOrder]);

  const visibleProviders = isExpanded
    ? filteredProviders
    : filteredProviders.slice(0, DEFAULT_VISIBLE_COUNT);
  const hasMore = filteredProviders.length > DEFAULT_VISIBLE_COUNT;

  // 统计摘要数据
  const stats = useMemo(() => {
    if (!catalogData?.items) {
      return { providerCount: 0, modelCount: 0, avgTps: 0, totalSamples: 0 };
    }
    const items = catalogData.items;
    const modelCount = items.reduce((sum, i) => sum + i.model_count, 0);
    const avgTps =
      items.length > 0
        ? items.reduce((sum, i) => sum + i.avg_tps, 0) / items.length
        : 0;
    const totalSamples = items.reduce((sum, i) => sum + i.total_samples, 0);
    return {
      providerCount: items.length,
      modelCount,
      avgTps,
      totalSamples,
    };
  }, [catalogData?.items]);

  const isInitialLoading = isLoading && !catalogData;
  const isUpdating = isValidating && !!catalogData;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* ===== 标题区域 ===== */}
      <section>
        <h1 className="font-serif text-3xl font-normal italic tracking-wide text-theme-text-primary">
          Providers
        </h1>
        <p className="mt-1.5 text-sm text-theme-text-muted">
          {isLoading ? (
            <span className="inline-block h-4 w-16 animate-pulse rounded bg-theme-bg-quaternary" />
          ) : (
            <>深入探究每个厂商的模型性能表现</>
          )}
        </p>
      </section>

      {/* ===== 统计摘要 ===== */}
      {!isInitialLoading && catalogData && (
        <ProvidersStatsSummary
          providerCount={stats.providerCount}
          modelCount={stats.modelCount}
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
              placeholder="搜索厂商..."
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
              onChange={(e) =>
                handleFilterChange(
                  setTimeRange,
                  e.target.value as "24h" | "7d" | "30d"
                )
              }
              disabled={isUpdating}
              className="appearance-none rounded-md border border-theme-border-light bg-theme-bg-primary px-3 py-2 pr-8 text-sm text-theme-text-secondary outline-none transition-colors focus:border-theme-accent-primary/40 focus:ring-1 focus:ring-theme-accent-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
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
                handleFilterChange(
                  setInputLength,
                  e.target.value as "" | "short" | "medium" | "long"
                )
              }
              disabled={isUpdating}
              className="appearance-none rounded-md border border-theme-border-light bg-theme-bg-primary px-3 py-2 pr-8 text-sm text-theme-text-secondary outline-none transition-colors focus:border-theme-accent-primary/40 focus:ring-1 focus:ring-theme-accent-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
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

          {/* 加载指示器 */}
          {isUpdating && (
            <div className="flex animate-pulse items-center gap-2 text-xs text-theme-accent-success">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-theme-accent-success/30 border-t-theme-accent-success" />
              <span>更新中...</span>
            </div>
          )}
        </div>
      </section>

      {/* ===== 厂商列表 ===== */}
      <section className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-theme-text-primary">
            厂商列表
          </h2>
          <p className="mt-0.5 text-xs text-theme-text-muted">
            点击表头排序，展开查看热门模型
          </p>
        </div>

        {isInitialLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-theme-border-subtle border-t-theme-accent-primary" />
            <span className="ml-3 text-sm text-theme-text-muted">加载中...</span>
          </div>
        ) : filteredProviders.length === 0 ? (
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
            <p className="mt-3 text-sm text-theme-text-muted">未找到厂商</p>
            <p className="mt-1 text-xs text-theme-text-disabled">
              请尝试调整搜索词或筛选条件
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className={`overflow-x-auto${isExpanded ? " max-h-[680px] overflow-y-auto" : ""}`}>
              <table className="w-full min-w-[700px] border-collapse">
                <thead className="sticky top-0 z-10 bg-theme-bg-secondary">
                  <tr className="border-b border-theme-border-subtle">
                  <th className="w-12 pb-3 pl-4 pt-2 text-left text-xs font-medium text-theme-text-muted">
                    #
                  </th>
                  <TableHeader label="厂商" className="min-w-0" />
                  <TableHeader
                    label="模型数"
                    active={sortField === "model_count"}
                    order={sortOrder}
                    onClick={() => handleSort("model_count")}
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
                  <TableHeader label="用量最大模型" align="right" className="w-28" />
                  <th className="w-14 pb-3 pr-4 pt-2 text-right text-xs font-medium text-theme-text-muted">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleProviders.map((item, index) => {
                  const rank = index + 1;
                  const isRowExpanded = expandedProviders.has(item.provider);
                  const bestModel =
                    item.top_models.length > 0 ? item.top_models[0] : null;

                  return (
                    <>
                      <tr
                        key={item.provider}
                        className="border-b border-theme-border-faint transition-colors hover:bg-theme-bg-overlay-subtlest"
                      >
                        {/* 排名 */}
                        <td className="w-12 py-3 pl-4">
                          <RankBadge rank={rank} />
                        </td>

                        {/* 厂商 */}
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <ProviderLogo provider={item.provider} size={28} />
                            <div className="min-w-0">
                              <Link
                                href={`/provider/${item.provider}`}
                                className="block truncate text-sm font-medium text-theme-text-secondary transition-colors hover:text-theme-accent-primary"
                                title={item.name}
                              >
                                {item.name}
                              </Link>
                            </div>
                          </div>
                        </td>

                        {/* 模型数 */}
                        <td className="w-16 py-3 text-right">
                          <span
                            className={`text-sm tabular-nums ${
                              sortField === "model_count"
                                ? "text-theme-text-tertiary"
                                : "text-theme-text-muted"
                            }`}
                          >
                            {item.model_count}
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

                        {/* 用量最大模型 */}
                        <td className="w-28 py-3 text-right">
                          {bestModel ? (
                            <Link
                              href={`/provider/${item.provider}/model/${encodeURIComponent(bestModel.name)}`}
                              className="inline-flex items-center gap-1 text-xs text-theme-accent-primary transition-colors hover:underline"
                            >
                              {bestModel.name}
                            </Link>
                          ) : (
                            <span className="text-xs text-theme-text-disabled">
                              —
                            </span>
                          )}
                        </td>

                        {/* 操作 */}
                        <td className="w-14 py-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleExpand(item.provider)}
                              className="rounded-md p-1.5 text-theme-text-muted transition-colors hover:bg-theme-bg-overlay-subtle hover:text-theme-text-secondary"
                              title={isRowExpanded ? "收起" : "展开热门模型"}
                            >
                              {isRowExpanded ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                            </button>
                            <Link
                              href={`/provider/${item.provider}`}
                              className="rounded-md p-1.5 text-theme-text-muted transition-colors hover:bg-theme-bg-overlay-subtle hover:text-theme-text-secondary"
                              title="查看详情"
                            >
                              <ExternalLink size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* 展开的 top3 模型 */}
                      {isRowExpanded && (
                        <tr className="border-b border-theme-border-faint bg-theme-bg-overlay-subtlest/50">
                          <ProviderTopModelsDetail
                            provider={item.provider}
                            topModels={item.top_models}
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
                    共 {filteredProviders.length} 个
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
          href="/models"
          className="group relative overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm transition-all hover:border-theme-border-DEFAULT hover:bg-theme-bg-secondary"
        >
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-theme-accent-primary">
                <Package size={18} />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Models
                </span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-theme-text-primary transition-colors group-hover:text-theme-accent-primary">
                浏览所有模型
              </h3>
              <p className="mt-1 text-sm text-theme-text-muted">
                查看各模型在各厂商下的性能表现
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-theme-bg-quaternary/50 text-theme-text-muted transition-colors group-hover:bg-theme-accent-primary group-hover:text-theme-text-primary">
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
                <span className="text-xs font-medium uppercase tracking-wider">
                  Leaderboard
                </span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-theme-text-primary transition-colors group-hover:text-theme-accent-success">
                性能排行榜
              </h3>
              <p className="mt-1 text-sm text-theme-text-muted">
                查看各模型厂商组合的综合性能排名
              </p>
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
