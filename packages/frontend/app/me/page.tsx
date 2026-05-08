"use client";

import { useState } from "react";
import useSWR from "swr";
import { Github, Loader2, AlertCircle } from "lucide-react";

import ProfileHero from "@/components/me/ProfileHero";
import ContributionHeatmap from "@/components/me/ContributionHeatmap";
import MyModelTable from "@/components/me/MyModelTable";
import PerformanceHighlights from "@/components/me/PerformanceHighlights";
import MeFiltersBar from "@/components/me/MeFiltersBar";
import ProfileCharts from "@/components/me/ProfileCharts";
import EmptyState from "@/components/me/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchUserOverview,
  fetchContributionHeatmap,
  fetchPersonalProfile,
  fetchFilterOptions
} from "@/lib/api/index";
import { setDeviceIdCookie, getAuthUrl } from "@/lib/auth";

export default function MePage() {
  const { user, loading: authLoading } = useAuth();

  const [filters, setFilters] = useState({
    range: "30d",
    provider: "",
    input_length_bucket: ""
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const { data: filterOptions } = useSWR("filter-options", () =>
    fetchFilterOptions(false)
  );

  const {
    data: overview,
    error: overviewError,
    isLoading: overviewLoading
  } = useSWR(
    user ? "user-overview" : null,
    () => fetchUserOverview()
  );

  const { data: heatmapData } = useSWR(
    user ? ["contribution-heatmap", filters.range] : null,
    () => fetchContributionHeatmap(filters.range),
    { keepPreviousData: true }
  );

  const { data: profileData } = useSWR(
    user ? ["personal-profile", filters] : null,
    () =>
      fetchPersonalProfile({
        range: filters.range,
        provider: filters.provider,
        input_length_bucket: filters.input_length_bucket
      }),
    { keepPreviousData: true }
  );

  // 未登录状态
  if (authLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-6xl items-center justify-center px-4">
        <div className="flex items-center gap-2 text-theme-text-muted">
          <Loader2 size={20} className="animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl flex-col items-center justify-center px-4 py-20 text-center">
        {/* 装饰光晕 */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="h-[400px] w-[400px] rounded-full bg-theme-accent-primary/[0.03] blur-[120px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          {/* 图标 */}
          <Github size={40} className="text-theme-text-muted" strokeWidth={1.2} />

          {/* 标题 */}
          <h1 className="mt-8 font-serif text-3xl font-normal italic tracking-wide text-theme-text-primary">
            登录 LLMark
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-theme-text-muted">
            使用 GitHub 账号登录，查看你的测速贡献、性能画像与社区排名
          </p>

          {/* 特性简述 */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-theme-text-disabled">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-theme-accent-primary/60" />
              贡献热力图
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-theme-accent-primary/60" />
              个人测速画像
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-theme-accent-primary/60" />
              社区排行榜
            </span>
          </div>

          {/* 登录按钮 */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); setDeviceIdCookie(); window.location.href = getAuthUrl(); }}
            className="mt-10 inline-flex items-center gap-2.5 rounded-full bg-theme-accent-primary px-7 py-3 text-sm font-medium text-theme-text-primary transition-all hover:bg-theme-accent-primary/90 hover:shadow-lg hover:shadow-theme-accent-primary/20"
          >
            <Github size={18} />
            <span>使用 GitHub 登录</span>
          </a>

          <p className="mt-6 text-xs text-theme-text-disabled">
            仅读取公开信息，不访问你的代码仓库
          </p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (overviewError) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-theme-accent-warning/20 bg-theme-accent-warning/10 px-6 py-16 text-center">
          <AlertCircle size={32} className="text-theme-accent-warning" />
          <p className="mt-3 text-sm text-theme-accent-warning-light">
            个人数据加载失败，请稍后重试
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-theme-bg-quaternary px-4 py-2 text-sm text-theme-text-secondary hover:bg-theme-bg-quaternary/80"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // 数据加载中
  if (overviewLoading || !overview) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-6xl items-center justify-center px-4">
        <div className="flex items-center gap-2 text-theme-text-muted">
          <Loader2 size={20} className="animate-spin" />
          <span>加载个人数据...</span>
        </div>
      </div>
    );
  }

  const hasNoData = overview.summary.total_contributions === 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Zone 1: Profile Header */}
      <ProfileHero
        user={overview.user}
        contributionLevel={overview.summary.contribution_level}
        summary={overview.summary}
      />

      {hasNoData ? (
        <EmptyState />
      ) : (
        <>
          {/* Zone 2: Contribution Activity */}
          {heatmapData && (
            <ContributionHeatmap
              items={heatmapData.items}
              summary={heatmapData.summary}
              totalContributions={overview.summary.total_contributions}
            />
          )}

          {/* Zone 3: Performance Highlights */}
          {profileData?.comparison && profileData?.highlights && (
            <PerformanceHighlights
              summary={overview.summary}
              comparison={profileData.comparison}
              highlights={profileData.highlights}
            />
          )}

          {/* Zone 4: Detailed Breakdown */}
          {profileData?.model_entries && (
            <>
              <MeFiltersBar
                filters={filters}
                onChange={handleFilterChange}
                filterOptions={filterOptions || null}
              />

              <MyModelTable
                entries={profileData.model_entries}
                inputLengthBucketMeta={filterOptions?.input_length_bucket_meta}
              />

              {profileData.provider_distribution && (
                <ProfileCharts
                  providerDistribution={profileData.provider_distribution}
                  inputLengthDistribution={profileData.input_length_distribution || []}
                  inputLengthBucketMeta={filterOptions?.input_length_bucket_meta}
                  modelEntries={profileData.model_entries}
                />
              )}
            </>
          )}
        </>
      )}

      {/* 隐私说明 */}
      <p className="mt-4 text-center text-xs text-theme-text-disabled">
        LLMark 只展示匿名聚合后的测速指标，不展示你的 prompt、响应内容或 API Key。
      </p>
    </div>
  );
}
