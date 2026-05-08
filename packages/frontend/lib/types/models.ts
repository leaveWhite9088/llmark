// 模型相关类型

export type ModelEntryItem = {
  provider: string;
  provider_name: string;
  input_length_bucket: string | null;
  avg_tps: number;
  avg_ttft_ms: number;
  sample_count: number;
  data_quality: "sufficient" | "limited";
};

export type ModelMeta = {
  display_name: string;
  tags: string[];
  context_window: number;
  release_date: string;
  description: string;
};

export type ModelEntriesResponse = {
  items: ModelEntryItem[];
  available_filters: {
    providers: string[];
  };
  meta: ModelMeta | null;
};

export type ModelProviderData = {
  provider: string;
  name: string;
  avg_tps: number;
  avg_ttft: number;
};

export type ModelComparisonResponse = {
  model: string;
  data: {
    "24h": ModelProviderData[];
    "7d": ModelProviderData[];
    "30d": ModelProviderData[];
  };
};

export type ModelInsightItem = {
  icon: "speed" | "trend" | "stability" | "sample";
  title: string;
  description: string;
};

export type ModelInsightsResponse = {
  insights: ModelInsightItem[];
};

