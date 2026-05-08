// 厂商相关类型

export type ProviderOverview = {
  provider: string;
  provider_name: string;
  overview: {
    avg_tps: number;
    avg_ttft_ms: number;
    best_combo: {
      model: string;
      tps: number;
      ttft_ms: number;
    };
    total_models: number;
    total_samples: number;
  };
  compute_allocation: ComputeAllocationItem[];
  description: string | null;
  policies: string[];
};

export type ProviderModelItem = {
  model: string;
  input_length_bucket: string | null;
  avg_tps: number;
  avg_ttft_ms: number;
  sample_count: number;
  data_quality: "sufficient" | "limited";
};

export type ProviderModelsResponse = {
  items: ProviderModelItem[];
  available_filters: {
    models: string[];
  };
};

export type ComputeAllocationItem = {
  model: string;
  sample_count: number;
  percentage: number;
  avg_tps: number;
};

export type ModelInfoItem = {
  model: string;
  displayName: string;
  parameters: string;
  contextWindow: string;
  releaseDate: string;
  description: string;
  tags: string[];
};

export type ModelInfoResponse = {
  items: ModelInfoItem[];
};

