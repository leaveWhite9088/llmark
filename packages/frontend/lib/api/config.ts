// API 配置中心
// 客户端运行时根据当前 hostname 动态拼接 API 地址，支持局域网访问

const API_PORT = "8011";

export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:${API_PORT}/v1`;
  }
  // SSR fallback
  return process.env.NEXT_PUBLIC_API_URL ?? `http://127.0.0.1:${API_PORT}/v1`;
}

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// 运行时检测（用于调试）
export function getApiConfig() {
  return {
    apiUrl: getApiUrl(),
    useMock: USE_MOCK,
  };
}
