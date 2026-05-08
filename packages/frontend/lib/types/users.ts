// 用户和个人中心相关类型

import type { ContributionLevel } from "./common";

export type AuthUser = {
  id: number;
  github_id: string;
  github_username: string;
  github_avatar_url?: string | null;
  email?: string | null;
  created_at: string;
};

export type UserSummary = {
  total_contributions: number;
  rank: number;
  tested_models_count: number;
  tested_providers_count: number;
  total_ranked_users?: number;
  contributions_last_7d: number;
  streak_days: number;
  users_behind_percentage: number;
  distance_to_next_rank: number;
  contribution_level: ContributionLevel;
};

export type UserOverviewResponse = {
  user: AuthUser;
  summary: UserSummary;
};

export type HeatmapItem = {
  date: string; // YYYY-MM-DD
  count: number;
};

export type HeatmapSummary = {
  streak_days: number;
  best_day: {
    date: string;
    count: number;
  } | null;
};

export type ContributionHeatmapResponse = {
  range: string;
  items: HeatmapItem[];
  summary: HeatmapSummary;
};

export type PersonalModelItem = {
  provider: string;
  model: string;
  my_avg_tps: number;
  my_avg_ttft_ms: number;
  global_avg_tps: number;
  global_avg_ttft_ms: number;
};

export type MyStatsResponse = {
  total_contributions: number;
  rank: number;
  models: PersonalModelItem[];
};

export type PersonalModelEntry = {
  provider: string;
  model: string;
  input_length_bucket: "short" | "medium" | "long" | null;
  my_sample_count: number;
  my_avg_tps: number;
  my_avg_ttft_ms: number;
  global_avg_tps: number;
  global_avg_ttft_ms: number;
  last_contributed_at: string;
};

export type DistributionItem = {
  key: string;
  sample_count: number;
  percentage: number;
};

export type HighlightEntry = {
  provider: string;
  model: string;
  input_length_bucket: string | null;
  sample_count?: number;
  avg_tps?: number;
  avg_ttft_ms?: number;
};

export type ProfileHighlights = {
  most_contributed_entry: HighlightEntry | null;
  fastest_entry: HighlightEntry | null;
  lowest_ttft_entry: HighlightEntry | null;
};

export type ProfileComparison = {
  my_avg_tps: number;
  global_avg_tps: number;
  my_avg_ttft_ms: number;
  global_avg_ttft_ms: number;
  my_models_count: number;
  global_avg_models_count: number;
};

export type PersonalProfileResponse = {
  filters: {
    range: string;
    provider: string | null;
    input_length_bucket: string | null;
  };
  model_entries: PersonalModelEntry[];
  provider_distribution: DistributionItem[];
  input_length_distribution: DistributionItem[];
  highlights: ProfileHighlights;
  comparison: ProfileComparison;
};

// 用户排行榜
export type UserLeaderboardItem = {
  rank: number;
  user_id: number;
  username: string;
  avatar_url: string;
  total_contributions: number;
  models_tested: number;
  avg_tps: number;
  avg_ttft_ms: number;
  contribution_level: ContributionLevel;
  rank_change: number;
  badges: string[];
  streak_days: number;
  last_active_at?: string;
};

export type LevelDistributionItem = {
  level: ContributionLevel;
  count: number;
  percentage: number;
};

export type UserLeaderboardHighlight = {
  user_id: number;
  username: string;
  avatar_url?: string;
  contributions_7d?: number;
  rank_change?: number;
  avg_tps?: number;
};

export type UserLeaderboardStats = {
  total_contributors: number;
  total_contributions: number;
  models_covered: number;
  contributions_today: number;
  contributors_trend?: number;
  contributions_trend?: number;
  models_trend?: number;
  today_trend?: number;
};

export type UserLeaderboardPagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type UserLeaderboardResponse = {
  pagination: UserLeaderboardPagination;
  stats: UserLeaderboardStats;
  highlights: {
    weekly_star: UserLeaderboardHighlight | null;
    fastest_riser: UserLeaderboardHighlight | null;
    top_tps: UserLeaderboardHighlight | null;
  };
  level_distribution: LevelDistributionItem[];
  users: UserLeaderboardItem[];
  current_user_rank?: number;
};
