import { getApiUrl } from "./config";

export function buildQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  return query.toString();
}

export async function fetchWithSession(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? undefined);
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });
  return res;
}

export async function fetchPublic(path: string, init: RequestInit = {}) {
  const res = await fetch(`${getApiUrl()}${path}`, init);
  return res;
}
