import type {
  AuthUser,
  UserOverviewResponse,
  ContributionHeatmapResponse,
  PersonalProfileResponse,
  MyStatsResponse,
  PersonalModelEntry,
  DistributionItem,
  ProfileHighlights,
  ProfileComparison,
} from "@/lib/types";

const MOCK_USER: AuthUser = {
  id: 42,
  github_id: "12345678",
  github_username: "speed_tester",
  github_avatar_url: "https://avatars.githubusercontent.com/u/12345678?v=4",
  email: "speed@example.com",
  created_at: "2025-01-15T08:00:00Z",
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// ==================== Mock 数据生成器 ====================

export function getMockMe(): AuthUser {
  return MOCK_USER;
}

export function getMockUserOverview(): UserOverviewResponse {
  return {
    user: MOCK_USER,
    summary: {
      total_contributions: 342,
      rank: 23,
      tested_models_count: 18,
      tested_providers_count: 7,
      total_ranked_users: 156,
      contributions_last_7d: 28,
      streak_days: 12,
      users_behind_percentage: 85.3,
      distance_to_next_rank: 15,
      contribution_level: "advanced",
    },
  };
}

export function getMockContributionHeatmap(
  range: string = "365d"
): ContributionHeatmapResponse {
  const items: ContributionHeatmapResponse["items"] = [];
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 365;
  const now = new Date();

  let maxCount = 0;
  let bestDay: { date: string; count: number } | null = null;
  let currentStreak = 0;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    const seed = i * 17 + 42;
    const rand = seededRandom(seed);

    // 70% 的概率有贡献，周末贡献更多
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseProbability = isWeekend ? 0.85 : 0.65;
    const hasContribution = rand < baseProbability;

    const count = hasContribution
      ? Math.floor(rand * 30) + 1 + (isWeekend ? 5 : 0)
      : 0;

    if (count > 0) {
      currentStreak++;
    } else {
      currentStreak = 0;
    }

    if (count > maxCount) {
      maxCount = count;
      bestDay = { date: dateStr, count };
    }

    items.push({ date: dateStr, count });
  }

  return {
    range,
    items,
    summary: {
      streak_days: Math.min(currentStreak, 12),
      best_day: bestDay,
    },
  };
}

// 生成模型贡献条目
function generateMockModelEntries(
  range?: string,
  providerFilter?: string,
  inputLengthFilter?: string
): PersonalModelEntry[] {
  const providers = [
    { key: "openai", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"] },
    { key: "anthropic", models: ["claude-3-5-sonnet", "claude-3-opus", "claude-3-haiku"] },
    { key: "deepseek", models: ["deepseek-chat", "deepseek-reasoner"] },
    { key: "aliyun", models: ["qwen-turbo", "qwen-plus", "qwen-max"] },
    { key: "siliconflow", models: ["deepseek-chat", "qwen-plus"] },
    { key: "google", models: ["gemini-1.5-pro", "gemini-1.5-flash"] },
    { key: "moonshot", models: ["kimi-k1", "kimi-k1.5"] },
  ];

  const buckets: Array<"short" | "medium" | "long" | null> = [
    "short",
    "medium",
    "long",
    null,
  ];

  const entries: PersonalModelEntry[] = [];
  let seed = 100;

  for (const { key: prov, models } of providers) {
    if (providerFilter && prov !== providerFilter) continue;

    for (const model of models) {
      for (const bucket of buckets) {
        if (inputLengthFilter && bucket !== inputLengthFilter) continue;

        const rand = seededRandom(seed++);
        // 不是每个组合都有数据
        if (rand > 0.6) continue;

        const baseTps = 50 + rand * 100;
        const baseTtft = 100 + rand * 200;
        const sampleCount = Math.floor(5 + rand * 45);

        entries.push({
          provider: prov,
          model,
          input_length_bucket: bucket,
          my_sample_count: sampleCount,
          my_avg_tps: Number((baseTps + (rand - 0.5) * 20).toFixed(1)),
          my_avg_ttft_ms: Math.floor(baseTtft + (rand - 0.5) * 40),
          global_avg_tps: Number((baseTps * (0.9 + rand * 0.2)).toFixed(1)),
          global_avg_ttft_ms: Math.floor(baseTtft * (0.95 + rand * 0.1)),
          last_contributed_at: new Date(
            Date.now() - Math.floor(rand * 30 * 24 * 60 * 60 * 1000)
          ).toISOString(),
        });
      }
    }
  }

  return entries;
}

// 生成 Highlights
function generateMockHighlights(
  entries: PersonalModelEntry[]
): ProfileHighlights {
  if (entries.length === 0) {
    return {
      most_contributed_entry: null,
      fastest_entry: null,
      lowest_ttft_entry: null,
    };
  }

  const mostContributed = entries.reduce((best, e) =>
    e.my_sample_count > best.my_sample_count ? e : best
  );
  const fastest = entries.reduce((best, e) =>
    e.my_avg_tps > best.my_avg_tps ? e : best
  );
  const lowestTtft = entries.reduce((best, e) =>
    e.my_avg_ttft_ms < best.my_avg_ttft_ms ? e : best
  );

  return {
    most_contributed_entry: {
      provider: mostContributed.provider,
      model: mostContributed.model,
      input_length_bucket: mostContributed.input_length_bucket,
      sample_count: mostContributed.my_sample_count,
    },
    fastest_entry: {
      provider: fastest.provider,
      model: fastest.model,
      input_length_bucket: fastest.input_length_bucket,
      avg_tps: fastest.my_avg_tps,
    },
    lowest_ttft_entry: {
      provider: lowestTtft.provider,
      model: lowestTtft.model,
      input_length_bucket: lowestTtft.input_length_bucket,
      avg_ttft_ms: lowestTtft.my_avg_ttft_ms,
    },
  };
}

// 生成分布数据
function generateMockDistributions(
  entries: PersonalModelEntry[]
): {
  providerDistribution: DistributionItem[];
  inputLengthDistribution: DistributionItem[];
} {
  // 厂商分布
  const providerMap = new Map<string, number>();
  for (const entry of entries) {
    providerMap.set(
      entry.provider,
      (providerMap.get(entry.provider) || 0) + entry.my_sample_count
    );
  }
  const providerTotal = Array.from(providerMap.values()).reduce(
    (a, b) => a + b,
    0
  );
  const providerDistribution: DistributionItem[] = Array.from(
    providerMap.entries()
  )
    .map(([key, sample_count]) => ({
      key,
      sample_count,
      percentage: Number(((sample_count / providerTotal) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.sample_count - a.sample_count);

  // 输入长度分布
  const bucketMap = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.input_length_bucket ?? "all";
    bucketMap.set(key, (bucketMap.get(key) || 0) + entry.my_sample_count);
  }
  const bucketTotal = Array.from(bucketMap.values()).reduce((a, b) => a + b, 0);
  const inputLengthDistribution: DistributionItem[] = Array.from(
    bucketMap.entries()
  )
    .map(([key, sample_count]) => ({
      key,
      sample_count,
      percentage: Number(((sample_count / bucketTotal) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.sample_count - a.sample_count);

  return { providerDistribution, inputLengthDistribution };
}

export function getMockPersonalProfile(params: {
  range?: string;
  provider?: string;
  input_length_bucket?: string;
} = {}): PersonalProfileResponse {
  const entries = generateMockModelEntries(
    params.range,
    params.provider,
    params.input_length_bucket
  );

  const { providerDistribution, inputLengthDistribution } =
    generateMockDistributions(entries);

  const totalSamples = entries.reduce((s, e) => s + e.my_sample_count, 0);
  const avgTps =
    totalSamples > 0
      ? entries.reduce((s, e) => s + e.my_avg_tps * e.my_sample_count, 0) /
        totalSamples
      : 0;
  const avgTtft =
    totalSamples > 0
      ? entries.reduce(
          (s, e) => s + e.my_avg_ttft_ms * e.my_sample_count,
          0
        ) / totalSamples
      : 0;

  const comparison: ProfileComparison = {
    my_avg_tps: Number(avgTps.toFixed(1)),
    global_avg_tps: Number((avgTps * 0.92).toFixed(1)),
    my_avg_ttft_ms: Math.floor(avgTtft),
    global_avg_ttft_ms: Math.floor(avgTtft * 1.08),
    my_models_count: new Set(entries.map((e) => e.model)).size,
    global_avg_models_count: 8.5,
  };

  return {
    filters: {
      range: params.range ?? "30d",
      provider: params.provider ?? null,
      input_length_bucket: params.input_length_bucket ?? null,
    },
    model_entries: entries,
    provider_distribution: providerDistribution,
    input_length_distribution: inputLengthDistribution,
    highlights: generateMockHighlights(entries),
    comparison,
  };
}

export function getMockMyStats(): MyStatsResponse {
  const entries = generateMockModelEntries();
  return {
    total_contributions: entries.reduce((s, e) => s + e.my_sample_count, 0),
    rank: 23,
    models: entries.slice(0, 5).map((e) => ({
      provider: e.provider,
      model: e.model,
      my_avg_tps: e.my_avg_tps,
      my_avg_ttft_ms: e.my_avg_ttft_ms,
      global_avg_tps: e.global_avg_tps,
      global_avg_ttft_ms: e.global_avg_ttft_ms,
    })),
  };
}
