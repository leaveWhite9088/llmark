import { fetchPublic } from "./client";
import { USE_MOCK } from "./config";
import type { FilterOptions, LeaderboardItem } from "@/lib/types";
import { getMockLeaderboard, getMockFilterOptions } from "@/lib/mocks/performance";

const FILTER_OPTIONS_CACHE_KEY = "llmark:filter-options";
const FILTER_OPTIONS_CACHE_TTL_MS = 15 * 60 * 1000;

function readFilterOptionsCache(): FilterOptions | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(FILTER_OPTIONS_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: {
      expires_at?: number;
      data?: FilterOptions;
    } = JSON.parse(raw);
    if (!parsed.expires_at || !parsed.data || parsed.expires_at < Date.now()) {
      window.localStorage.removeItem(FILTER_OPTIONS_CACHE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeFilterOptionsCache(data: FilterOptions): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      FILTER_OPTIONS_CACHE_KEY,
      JSON.stringify({
        expires_at: Date.now() + FILTER_OPTIONS_CACHE_TTL_MS,
        data
      })
    );
  } catch {
    // ignore cache write failures
  }
}

export async function fetchLeaderboard(params: {
  sort_by?: "tps" | "ttft";
  provider?: string;
  model?: string;
  input_length_bucket?: string;
  range?: "24h" | "7d" | "30d";
}): Promise<LeaderboardItem[]> {
  if (USE_MOCK) {
    return getMockLeaderboard(params);
  }

  const { buildQuery } = await import("./client");
  const query = buildQuery(params);
  const res = await fetchPublic(`/leaderboard?${query}`, {
    next: { revalidate: 0 }
  });
  if (!res.ok) {
    throw new Error("Failed to fetch leaderboard");
  }
  return res.json();
}

export async function fetchFilterOptions(forceRefresh = false): Promise<FilterOptions> {
  if (USE_MOCK) {
    return getMockFilterOptions();
  }

  if (!forceRefresh) {
    const cached = readFilterOptionsCache();
    if (cached) {
      return cached;
    }
  }

  const res = await fetchPublic(`/meta/filters`, {
    next: { revalidate: 900 }
  });
  if (!res.ok) {
    throw new Error("Failed to fetch filter options");
  }
  const data: FilterOptions = await res.json();
  writeFilterOptionsCache(data);
  return data;
}
