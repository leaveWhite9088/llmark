import type { UserLeaderboardResponse, ContributionLevel } from "@/lib/types";

const LEVELS: ContributionLevel[] = ["observer", "beginner", "intermediate", "advanced", "expert", "legend"];
const LEVEL_THRESHOLDS = [0, 10, 50, 200, 500, 1000];

/**
 * 生成 Mock 用户数据
 */
export function generateMockUsers(
  currentPage: number,
  currentPageSize: number,
  currentUserId?: number
) {
  const totalUsers = 156;
  const startRank = (currentPage - 1) * currentPageSize + 1;
  const endRank = Math.min(startRank + currentPageSize - 1, totalUsers);

  return Array.from({ length: endRank - startRank + 1 }, (_, i) => {
    const rank = startRank + i;
    const baseContributions = Math.max(15600 - (rank - 1) * 100, 5);
    const contributions = Math.floor(baseContributions * (0.8 + Math.random() * 0.4));

    // 根据贡献数确定等级
    let levelIndex = 0;
    for (let j = LEVEL_THRESHOLDS.length - 1; j >= 0; j--) {
      if (contributions >= LEVEL_THRESHOLDS[j]) {
        levelIndex = j;
        break;
      }
    }

    return {
      rank,
      user_id: rank,
      username: `contributor_${rank}`,
      avatar_url: "",
      total_contributions: contributions,
      models_tested: Math.max(5, Math.floor(45 - (rank - 1) * 0.2)),
      avg_tps: Number((100 + Math.random() * 100).toFixed(1)),
      avg_ttft_ms: Math.floor(150 + Math.random() * 100),
      contribution_level: LEVELS[levelIndex],
      rank_change: Math.floor(Math.random() * 21) - 10,
      badges: rank <= 10 ? ["top10"] : rank <= 100 ? ["top100"] : [],
      streak_days: Math.floor(Math.random() * 50),
      last_active_at: `${Math.floor(Math.random() * 24)}小时前`,
    };
  });
}

/**
 * 获取 Mock 排行榜数据（当 API 不可用时使用）
 */
export function getMockLeaderboardData(
  page: number,
  pageSize: number,
  currentUserId?: number
): UserLeaderboardResponse {
  const totalUsers = 156;
  const totalPages = Math.ceil(totalUsers / pageSize);

  return {
    pagination: {
      page,
      page_size: pageSize,
      total: totalUsers,
      total_pages: totalPages,
    },
    stats: {
      total_contributors: 156,
      total_contributions: 45678,
      models_covered: 89,
      contributions_today: 234,
      contributors_trend: 12,
      contributions_trend: 3456,
      models_trend: 3,
      today_trend: 45,
    },
    highlights: {
      weekly_star: {
        user_id: 1,
        username: "speed_master",
        avatar_url: "",
        contributions_7d: 156,
      },
      fastest_riser: {
        user_id: 5,
        username: "ai_explorer",
        avatar_url: "",
        rank_change: 12,
      },
      top_tps: {
        user_id: 3,
        username: "model_hunter",
        avatar_url: "",
        avg_tps: 245.6,
      },
    },
    level_distribution: [
      { level: "observer", count: 45, percentage: 28.8 },
      { level: "beginner", count: 52, percentage: 33.3 },
      { level: "intermediate", count: 35, percentage: 22.4 },
      { level: "advanced", count: 15, percentage: 9.6 },
      { level: "expert", count: 7, percentage: 4.5 },
      { level: "legend", count: 2, percentage: 1.3 },
    ],
    users: generateMockUsers(page, pageSize, currentUserId),
    current_user_rank: currentUserId ? 67 : undefined,
  };
}
