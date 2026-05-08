// 目录/列表相关类型

export type ModelCatalogItem = {
  model: string;
  provider_count: number;
  avg_tps: number;
  avg_ttft_ms: number;
  total_samples: number;
  best_provider: {
    name: string;
    display_name: string;
    avg_tps: number;
  };
};

export type ModelsCatalogResponse = {
  items: ModelCatalogItem[];
  total: number;
};

export type ModelProviderDetail = {
  provider: string;
  provider_name: string;
  model: string;
  avg_tps: number;
  avg_ttft_ms: number;
  sample_count: number;
  data_quality: "sufficient" | "limited";
};

export type ProviderTopModel = {
  name: string;
  avg_tps: number;
  avg_ttft_ms: number;
  sample_count: number;
};

export type ProviderCatalogItem = {
  provider: string;
  name: string;
  logo_url?: string;
  model_count: number;
  avg_tps: number;
  avg_ttft_ms: number;
  total_samples: number;
  top_models: ProviderTopModel[];
};

export type ProvidersCatalogResponse = {
  items: ProviderCatalogItem[];
  total: number;
};
