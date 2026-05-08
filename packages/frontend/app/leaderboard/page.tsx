"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchUserLeaderboard } from "@/lib/api/index";
import type { UserLeaderboardResponse } from "@/lib/types";
import { USE_MOCK } from "@/lib/api/config";
import { getMockLeaderboardData } from "@/lib/mocks/leaderboard";
import CommunityStats from "@/components/user-leaderboard/CommunityStats";
import HighlightsBar from "@/components/user-leaderboard/HighlightsBar";
import LevelDistributionBar from "@/components/user-leaderboard/LevelDistributionBar";
import UserStatusPanel from "@/components/user-leaderboard/UserStatusPanel";
import UserLeaderboardTable from "@/components/user-leaderboard/UserLeaderboardTable";
import { Loader2 } from "lucide-react";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserLeaderboardResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchUserLeaderboard({
        page,
        page_size: pageSize,
        sort_by: "rank",
        sort_order: "asc",
      });
      setData(response);
    } catch (err) {
      setError("加载数据失败，请稍后重试");
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const scrollToMyRank = () => {
    if (data?.current_user_rank) {
      const element = document.getElementById(
        `user-rank-${data.current_user_rank}`
      );
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("bg-theme-accent-primary/10");
        setTimeout(() => {
          element.classList.remove("bg-theme-accent-primary/10");
        }, 2000);
      }
    }
  };

  const mockData = getMockLeaderboardData(page, pageSize, user?.id);
  // mock 模式下用带 currentUserRank 的 mockData；真实模式下用 API 数据
  const displayData = USE_MOCK ? mockData : (data ?? mockData);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* ===== 标题区域 ===== */}
      <section className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl font-normal italic tracking-wide text-theme-text-primary">
            Contributors
          </h1>
          <p className="mt-1.5 text-sm text-theme-text-muted">
            感谢所有为 LLMark 社区贡献测速数据的用户
          </p>
        </div>
        <UserStatusPanel
          user={user}
          currentUserRank={displayData.current_user_rank}
          contributionLevel={displayData.users.find((u) => u.user_id === user?.id)?.contribution_level}
          onScrollToRank={scrollToMyRank}
        />
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-theme-text-muted" />
          <span className="ml-3 text-sm text-theme-text-muted">加载中...</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-quaternary/30 px-6 py-16 text-center">
          <p className="text-sm text-theme-text-muted">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 rounded-lg bg-theme-accent-primary px-4 py-2 text-sm font-medium text-theme-text-primary transition-colors hover:bg-theme-accent-primary/90"
          >
            重试
          </button>
        </div>
      ) : (
        <>
          {/* ===== 亮点用户 ===== */}
          <HighlightsBar
            weeklyStar={displayData.highlights.weekly_star}
            fastestRiser={displayData.highlights.fastest_riser}
            topTps={displayData.highlights.top_tps}
          />

          {/* ===== 统计 + 等级分布 ===== */}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <CommunityStats
                totalContributors={displayData.stats.total_contributors}
                totalContributions={displayData.stats.total_contributions}
                modelsCovered={displayData.stats.models_covered}
                contributionsToday={displayData.stats.contributions_today}
                contributorsTrend={displayData.stats.contributors_trend}
                contributionsTrend={displayData.stats.contributions_trend}
                modelsTrend={displayData.stats.models_trend}
                todayTrend={displayData.stats.today_trend}
              />
            </div>
            <LevelDistributionBar
              distribution={displayData.level_distribution}
              currentLevel={displayData.users.find((u) => u.user_id === user?.id)?.contribution_level}
            />
          </section>

          {/* ===== 排行榜表格 ===== */}
          <section
            id="user-leaderboard"
            className="scroll-mt-20 rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 p-5 backdrop-blur-sm"
          >
            <div className="mb-4">
              <h2 className="text-base font-semibold text-theme-text-primary">
                详细排行
              </h2>
              <p className="mt-0.5 text-xs text-theme-text-muted">
                点击表头排序，悬停查看操作
              </p>
            </div>
            <UserLeaderboardTable
              users={displayData.users}
              pagination={displayData.pagination}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              currentUserId={user?.id}
            />
          </section>
        </>
      )}
    </div>
  );
}
