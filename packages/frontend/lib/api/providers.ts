import { fetchPublic, buildQuery } from "./client";
import { USE_MOCK } from "./config";
import type {
  ProviderOverview,
  ProviderModelsResponse,
  ModelInfoResponse,
} from "@/lib/types";
import {
  getMockProviderOverview,
  getMockProviderModels,
  getMockModelInfo,
} from "@/lib/mocks/performance";

export async function fetchProviderOverview(
  provider: string,
  params: {
    range?: "24h" | "7d" | "30d";
    input_length_bucket?: string;
  } = {}
): Promise<ProviderOverview> {
  if (USE_MOCK) {
    return getMockProviderOverview(provider, {
      range: params.range,
      input_length_bucket: params.input_length_bucket,
    });
  }
  const query = buildQuery(params);
  const res = await fetchPublic(`/provider/${provider}/overview?${query}`);
  if (!res.ok) {
    throw new Error("Failed to fetch provider overview");
  }
  return res.json();
}

export async function fetchProviderModels(
  provider: string,
  params: {
    range?: "24h" | "7d" | "30d";
    input_length_bucket?: string;
    model?: string;
  } = {}
): Promise<ProviderModelsResponse> {
  if (USE_MOCK) {
    return getMockProviderModels(provider, {
      range: params.range,
      input_length_bucket: params.input_length_bucket,
      model: params.model,
    });
  }
  const query = buildQuery(params);
  const res = await fetchPublic(`/provider/${provider}/models?${query}`);
  if (!res.ok) {
    throw new Error("Failed to fetch provider models");
  }
  return res.json();
}

export async function fetchModelInfo(
  provider: string,
  params: {
    model?: string;
  } = {}
): Promise<ModelInfoResponse> {
  if (USE_MOCK) {
    return getMockModelInfo(provider, { model: params.model });
  }
  const query = buildQuery(params);
  const res = await fetchPublic(`/provider/${provider}/models/info?${query}`);
  if (!res.ok) {
    throw new Error("Failed to fetch model info");
  }
  return res.json();
}

