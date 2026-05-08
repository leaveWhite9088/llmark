import { fetchPublic, buildQuery } from "./client";
import { USE_MOCK } from "./config";
import type {
  DetailResponse,
  ModelEntriesResponse,
  ModelComparisonResponse,
  ModelsCatalogResponse,
  ProvidersCatalogResponse,
  ModelInsightsResponse,
} from "@/lib/types";
import {
  getMockModelsCatalog,
  getMockModelComparison,
  getMockModelEntries,
  getMockDetail,
  getMockModelInsights,
} from "@/lib/mocks/performance";

export async function fetchDetail(params: {
  provider: string;
  model: string;
  range: "24h" | "7d" | "30d";
  input_length_bucket?: string;
}): Promise<DetailResponse> {
  if (USE_MOCK) {
    return getMockDetail(
      params.provider,
      params.model,
      params.range,
      params.input_length_bucket
    );
  }
  const query = buildQuery(params);
  const res = await fetchPublic(`/detail?${query}`);
  if (!res.ok) {
    throw new Error("Failed to fetch detail");
  }
  return res.json();
}

export async function fetchModelEntries(
  model: string,
  params: {
    range?: "24h" | "7d" | "30d";
    input_length_bucket?: string;
    provider?: string;
  } = {}
): Promise<ModelEntriesResponse> {
  if (USE_MOCK) {
    return getMockModelEntries(model, {
      input_length_bucket: params.input_length_bucket,
      provider: params.provider,
    });
  }
  const query = buildQuery(params);
  const res = await fetchPublic(`/model/${encodeURIComponent(model)}/entries?${query}`);
  if (!res.ok) {
    throw new Error("Failed to fetch model entries");
  }
  return res.json();
}

export async function fetchModelComparison(
  model: string,
  params: {
    input_length_bucket?: string;
  } = {}
): Promise<ModelComparisonResponse> {
  if (USE_MOCK) {
    return getMockModelComparison(model);
  }
  const query = buildQuery(params);
  const res = await fetchPublic(`/model/${encodeURIComponent(model)}/comparison?${query}`);
  if (!res.ok) {
    throw new Error("Failed to fetch model comparison");
  }
  return res.json();
}

export async function fetchModelsCatalog(params: {
  range?: "24h" | "7d" | "30d";
  input_length_bucket?: string;
  sort_by?: "tps" | "ttft" | "sample_count" | "provider_count" | "name";
  sort_order?: "asc" | "desc";
} = {}): Promise<ModelsCatalogResponse> {
  if (USE_MOCK) {
    return getMockModelsCatalog({
      sort_by: params.sort_by,
      sort_order: params.sort_order,
    });
  }
  const query = buildQuery(params);
  const res = await fetchPublic(`/models?${query}`);
  if (!res.ok) {
    throw new Error("Failed to fetch models catalog");
  }
  return res.json();
}

export async function fetchProvidersCatalog(params: {
  range?: "24h" | "7d" | "30d";
  input_length_bucket?: string;
  sort_by?: "tps" | "ttft" | "sample_count" | "model_count" | "name";
  sort_order?: "asc" | "desc";
} = {}): Promise<ProvidersCatalogResponse> {
  if (USE_MOCK) {
    const { getMockProvidersCatalog } = await import("@/lib/mocks/performance");
    return getMockProvidersCatalog();
  }
  const query = buildQuery(params);
  const res = await fetchPublic(`/providers?${query}`);
  if (!res.ok) {
    throw new Error("Failed to fetch providers catalog");
  }
  return res.json();
}

export async function fetchModelInsights(
  model: string,
  provider: string
): Promise<ModelInsightsResponse> {
  if (USE_MOCK) {
    return getMockModelInsights(model);
  }
  const query = buildQuery({ provider });
  const res = await fetchPublic(`/model/${encodeURIComponent(model)}/insights?${query}`);
  if (!res.ok) {
    throw new Error("Failed to fetch model insights");
  }
  return res.json();
}

