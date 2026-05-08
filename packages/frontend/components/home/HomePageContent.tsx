"use client";

import { useMemo, useCallback, useTransition, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { RefreshCcw, Package, Building2, ArrowRight } from "lucide-react";
import useSWR from "swr";

import FilterBar from "@/components/home/FilterBar";
import BarChartLeaderboard from "@/components/home/BarChartLeaderboard";
import LeaderboardTable from "@/components/home/LeaderboardTable";
import StatsSummary from "@/components/home/StatsSummary";
import { fetchFilterOptions, fetchLeaderboard } from "@/lib/api/index";
import type { LeaderboardItem } from "@/lib/types";

type SortField = "tps" | "ttft" | "samples";
type SortOrder = "asc" | "desc";

// 加载动画
function LoadingSpinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-theme-border-subtle border-t-theme-accent-primary" />
  );
}

export default function HomePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // 从 URL 读取筛选状态
  const provider = searchParams.get("provider") || "";
  const model = searchParams.get("model") || "";
  const inputLengthBucket = searchParams.get("input_length") || "";
  const timeRange = (searchParams.get("range") as "24h" | "7d" | "30d") || "7d";
  const sortBy = (searchParams.get("sort") as SortField) || "tps";
  const sortOrder = (searchParams.get("order") as SortOrder) || "desc";

  // 更新 URL 参数的通用函数
  const updateSearchParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, pathname, router]
  );

  const setProvider = useCallback(
    (value: string) => updateSearchParam("provider", value),
    [updateSearchParam]
  );
  const setModel = useCallback(
    (value: string) => updateSearchParam("model", value),
    [updateSearchParam]
  );
  const setInputLengthBucket = useCallback(
    (value: string) => updateSearchParam("input_length", value),
    [updateSearchParam]
  );
  const setSortBy = useCallback(
    (value: SortField) => updateSearchParam("sort", value),
    [updateSearchParam]
  );
  const setSortOrder = useCallback(
    (value: SortOrder) => updateSearchParam("order", value),
    [updateSearchParam]
  );
  const setSort = useCallback(
    (field: SortField, order: SortOrder) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", field);
      params.set("order", order);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, pathname, router]
  );
  const setTimeRange = useCallback(
    (value: string) => updateSearchParam("range", value),
    [updateSearchParam]
  );

  const clearAllFilters = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (sortBy !== "tps") {
        params.set("sort", sortBy);
      }
      if (sortOrder !== "desc") {
        params.set("order", sortOrder);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [pathname, router, sortBy, sortOrder]);

  const {
    data: filterOptions,
    error: filterOptionsError,
    mutate: mutateFilterOptions,
  } = useSWR("filter-options", () => fetchFilterOptions(false), {
    revalidateOnFocus: false,
    refreshInterval: 0,
    dedupingInterval: 15 * 60 * 1000,
  });

  const prevDataRef = useRef<LeaderboardItem[] | undefined>(undefined);

  const {
    data: rawData,
    isLoading,
    isValidating,
    error,
    mutate,
  } = useSWR(
    ["leaderboard", provider, model, inputLengthBucket, timeRange],
    () =>
      fetchLeaderboard({
        sort_by: "tps",
        provider,
        model,
        input_length_bucket: inputLengthBucket,
        range: timeRange,
      }),
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const displayData = useMemo(() => {
    if (rawData !== undefined) {
      prevDataRef.current = rawData;
      return rawData;
    }
    return prevDataRef.current;
  }, [rawData]);

  const hasCachedData = Boolean(prevDataRef.current && prevDataRef.current.length > 0);
  const hasData = Boolean(displayData && displayData.length > 0);
  const showInitialLoading = isLoading && !hasCachedData;
  const showUpdatingIndicator = isValidating && hasData;

  // 排序逻辑 - 支持多字段和方向
  const sortedData = useMemo(() => {
    if (!displayData) return displayData;
    const sorted = [...displayData];
    const desc = sortOrder === "desc";
    switch (sortBy) {
      case "tps":
        sorted.sort((a, b) =>
          desc
            ? b.avg_tps - a.avg_tps || a.avg_ttft_ms - b.avg_ttft_ms
            : a.avg_tps - b.avg_tps || b.avg_ttft_ms - a.avg_ttft_ms
        );
        break;
      case "ttft":
        sorted.sort((a, b) =>
          desc
            ? b.avg_ttft_ms - a.avg_ttft_ms || a.avg_tps - b.avg_tps
            : a.avg_ttft_ms - b.avg_ttft_ms || b.avg_tps - a.avg_tps
        );
        break;
      case "samples":
        sorted.sort((a, b) =>
          desc
            ? b.sample_count - a.sample_count || a.avg_tps - b.avg_tps
            : a.sample_count - b.sample_count || b.avg_tps - a.avg_tps
        );
        break;
      default:
        sorted.sort((a, b) =>
          desc ? b.avg_tps - a.avg_tps : a.avg_tps - b.avg_tps
        );
    }
    return sorted;
  }, [displayData, sortBy, sortOrder]);

  const handleRefresh = async () => {
    const latestFilters = await fetchFilterOptions(true);
    await Promise.all([
      mutate(),
      mutateFilterOptions(latestFilters, { revalidate: false }),
    ]);
  };

  const lastUpdated = displayData?.[0]?.last_reported_at
    ? new Date(displayData[0].last_reported_at).toLocaleString("zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* ===== 标题区域 ===== */}
      <section className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-normal italic tracking-wide text-theme-text-primary">
            LLMark API Benchmark
          </h1>
          <p className="mt-1.5 text-sm text-theme-text-muted">
            社区驱动的真实性能数据
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="hidden text-xs text-theme-text-disabled sm:inline">
              更新于 {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-theme-text-muted transition-colors hover:bg-theme-bg-overlay-subtle hover:text-theme-text-secondary"
            title="刷新数据"
          >
            <RefreshCcw size={15} />
          </button>
        </div>
      </section>

      {/* ===== 核心指标摘要 ===== */}
      {!error && sortedData && (
        <StatsSummary items={sortedData} />
      )}

      {/* ===== 筛选工具栏 ===== */}
      <section className="relative z-30 rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-4 backdrop-blur-sm">
        <FilterBar
          provider={provider}
          onProviderChange={setProvider}
          model={model}
          onModelChange={setModel}
          inputLengthBucket={inputLengthBucket}
          onInputLengthBucketChange={setInputLengthBucket}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          onClearAll={clearAllFilters}
          providers={filterOptions?.providers ?? []}
          inputLengthBuckets={filterOptions?.input_length_buckets ?? ["short", "medium", "long"]}
          inputLengthBucketMeta={filterOptions?.input_length_bucket_meta}
        />
        {filterOptionsError ? (
          <p className="mt-3 text-xs text-theme-accent-warning">
            筛选项加载失败，暂时使用默认输入长度选项。
          </p>
        ) : null}
      </section>

      {/* ===== 图表区域 ===== */}
      {!error && sortedData && (
        <BarChartLeaderboard items={sortedData} />
      )}

      {/* ===== 详细排行榜 ===== */}
      <section
        id="leaderboard"
        className="scroll-mt-20 rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-theme-text-primary">详细排行</h2>
            <p className="mt-0.5 text-xs text-theme-text-muted">点击表头排序，悬停查看操作</p>
          </div>
          {showUpdatingIndicator && (
            <div className="flex items-center gap-2 text-xs text-theme-text-muted">
              <div className="h-3 w-3 animate-spin rounded-full border border-theme-accent-primary border-t-transparent" />
              <span>更新中...</span>
            </div>
          )}
        </div>

        {error ? (
          <div className="rounded-xl border border-theme-border-subtle bg-theme-accent-warning/10 px-6 py-16 text-center text-sm text-theme-accent-warning-light">
            排行榜暂时不可用，请稍后再试
          </div>
        ) : showInitialLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
            <span className="ml-3 text-sm text-theme-text-muted">加载中...</span>
          </div>
        ) : sortedData === undefined || sortedData.length === 0 ? (
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
            <p className="mt-3 text-sm text-theme-text-muted">暂无数据</p>
          </div>
        ) : (
          <LeaderboardTable
            items={sortedData}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(field, order) => {
              setSort(field, order);
            }}
          />
        )}
      </section>

      {/* ===== 探索更多 ===== */}
      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/models"
          className="group relative overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm transition-all hover:border-theme-border-default hover:bg-theme-bg-secondary"
        >
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-theme-accent-primary">
                <Package size={18} />
                <span className="text-xs font-medium uppercase tracking-wider">Models</span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-theme-text-primary transition-colors group-hover:text-theme-accent-primary">
                浏览所有模型
              </h3>
              <p className="mt-1 text-sm text-theme-text-muted">
                查看各模型在不同厂商的性能表现对比
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
          href="/providers"
          className="group relative overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm transition-all hover:border-theme-border-default hover:bg-theme-bg-secondary"
        >
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-theme-accent-success">
                <Building2 size={18} />
                <span className="text-xs font-medium uppercase tracking-wider">Providers</span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-theme-text-primary transition-colors group-hover:text-theme-accent-success"
              >
                浏览所有厂商
              </h3>
              <p className="mt-1 text-sm text-theme-text-muted">
                查看各厂商提供的模型及性能统计数据
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
