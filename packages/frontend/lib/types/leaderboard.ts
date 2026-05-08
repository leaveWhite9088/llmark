// 排行榜相关类型

export type LeaderboardItem = {
  provider: string;
  model: string;
  avg_tps: number;
  avg_ttft_ms: number;
  sample_count: number;
  input_length_bucket: "short" | "medium" | "long" | null;
  data_quality: "sufficient" | "limited";
  last_reported_at?: string;
  // 以下为新增字段（v2 redesign）
  // 趋势变化，时间基准跟随 range 参数
  trend_tps_change?: number;      // TPS 变化百分比，如 20.5 表示 +20.5%
  trend_ttft_change?: number;     // TTFT 变化百分比，如 -15.2 表示 -15.2%
  trend_samples_change?: number;  // 样本量变化绝对值，如 500 表示 +500，-200 表示 -200
  rank_change?: number;
  tags?: string[];
};

export type DetailTrendPoint = {
  time: string;
  avg_tps: number;
  avg_ttft_ms: number;
  p99_ttft_ms: number;
};

export type DetailResponse = {
  trend: DetailTrendPoint[];
};
