const LEGACY_TOKEN_KEY = "llmark_token";
const DEVICE_ID_KEY = "llmark_device_id";
const DEVICE_ID_COOKIE = "llmark_device_id";
const API_PORT = "8011";

export function clearLegacyToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
}

/** 动态获取 OAuth 登录地址，支持局域网访问 */
export function getAuthUrl(): string {
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:${API_PORT}/v1/auth/github`;
  }
  return `http://127.0.0.1:${API_PORT}/v1/auth/github`;
}

/** 生成 UUID v4，兼容非安全上下文（HTTP 局域网访问） */
function generateUUID(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** 获取或生成 device_id，持久化在 localStorage */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** 登录前将 device_id 写入 cookie，供后端绑定设备 */
export function setDeviceIdCookie(): void {
  const deviceId = getDeviceId();
  if (!deviceId) return;
  document.cookie = `${DEVICE_ID_COOKIE}=${deviceId}; path=/; max-age=600; samesite=lax`;
}
