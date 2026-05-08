import { fetchWithSession, buildQuery } from "./client";
import { USE_MOCK } from "./config";
import type {
  AuthUser,
  MyStatsResponse,
  UserOverviewResponse,
  ContributionHeatmapResponse,
  PersonalProfileResponse,
  UserLeaderboardResponse
} from "@/lib/types";
import { getMockLeaderboardData } from "@/lib/mocks/leaderboard";
import {
  getMockMe,
  getMockUserOverview,
  getMockContributionHeatmap,
  getMockPersonalProfile,
  getMockMyStats,
} from "@/lib/mocks/users";

export async function fetchMyStats(): Promise<MyStatsResponse> {
  if (USE_MOCK) {
    return getMockMyStats();
  }
  const res = await fetchWithSession(`/me/stats`);
  if (!res.ok) {
    throw new Error("Failed to fetch stats");
  }
  return res.json();
}

export async function fetchMe(): Promise<AuthUser | null> {
  if (USE_MOCK) {
    return getMockMe();
  }
  const res = await fetchWithSession(`/auth/me`, {
    cache: "no-store"
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function fetchLogout(): Promise<void> {
  await fetchWithSession(`/auth/logout`, {
    method: "POST"
  });
}

export async function fetchUserOverview(): Promise<UserOverviewResponse> {
  if (USE_MOCK) {
    return getMockUserOverview();
  }
  const res = await fetchWithSession(`/me/overview`, {
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Failed to fetch user overview");
  return res.json();
}

export async function fetchContributionHeatmap(
  range: string = "365d"
): Promise<ContributionHeatmapResponse> {
  if (USE_MOCK) {
    return getMockContributionHeatmap(range);
  }
  const query = buildQuery({ range });

  const res = await fetchWithSession(`/me/contribution-heatmap?${query}`, {
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Failed to fetch contribution heatmap");
  return res.json();
}

export async function fetchPersonalProfile(
  params: {
    range?: string;
    provider?: string;
    input_length_bucket?: string;
  } = {}
): Promise<PersonalProfileResponse> {
  if (USE_MOCK) {
    return getMockPersonalProfile(params);
  }
  const query = buildQuery({
    range: params.range,
    provider: params.provider,
    input_length_bucket: params.input_length_bucket
  });

  const res = await fetchWithSession(`/me/profile?${query}`, {
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Failed to fetch personal profile");
  return res.json();
}

export async function fetchUserLeaderboard(
  params: {
    page?: number;
    page_size?: number;
    sort_by?: "contributions" | "models" | "tps" | "ttft" | "rank";
    sort_order?: "asc" | "desc";
  } = {}
): Promise<UserLeaderboardResponse> {
  if (USE_MOCK) {
    return getMockLeaderboardData(
      params.page ?? 1,
      params.page_size ?? 20
    );
  }

  const query = buildQuery({
    page: params.page?.toString(),
    page_size: params.page_size?.toString(),
    sort_by: params.sort_by,
    sort_order: params.sort_order
  });

  const res = await fetchWithSession(`/users/leaderboard?${query}`, {
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Failed to fetch user leaderboard");
  return res.json();
}
