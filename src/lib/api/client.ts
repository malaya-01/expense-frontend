import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import type { ApiResponse } from "@/types";
import { beginApiActivity, endApiActivity } from "@/lib/api/activity";
import { getClientPlatform } from "@/lib/runtime-platform";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";
const ACCESS_STORAGE_KEY = "finos:access_token";
const REFRESH_STORAGE_KEY = "finos:refresh_token";
export const API_BASE_STORAGE_KEY = "finos:api_base_url";

const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000/api";

/** Runtime override (useful on Capacitor when rebuild isn't handy). */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const override = localStorage.getItem(API_BASE_STORAGE_KEY)?.trim();
      if (override) return override.replace(/\/$/, "");
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_API_BASE.replace(/\/$/, "");
}

export function setApiBaseUrl(url: string) {
  const cleaned = url.trim().replace(/\/$/, "");
  if (typeof window !== "undefined") {
    try {
      if (cleaned) localStorage.setItem(API_BASE_STORAGE_KEY, cleaned);
      else localStorage.removeItem(API_BASE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  try {
    api.defaults.baseURL = cleaned || DEFAULT_API_BASE.replace(/\/$/, "");
  } catch {
    /* api not ready yet */
  }
}

export function isLocalhostApiUrl(url = getApiBaseUrl()): boolean {
  return /localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(url);
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const encodedName = `${encodeURIComponent(name)}=`;
  const match = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(encodedName));
  return match ? decodeURIComponent(match.slice(encodedName.length)) : undefined;
}

function writeCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 86_400_000).toUTCString();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Expires=${expires}; SameSite=Lax${secure}`;
}

function removeCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function readLocal(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return localStorage.getItem(key) || undefined;
  } catch {
    return undefined;
  }
}

function writeLocal(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function clearLocal(key: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

async function persistNativeKey(key: string, value: string | null) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { Preferences } = await import("@capacitor/preferences");
    if (value) await Preferences.set({ key, value });
    else await Preferences.remove({ key });
  } catch {
    /* Capacitor optional */
  }
}

function isJwtExpired(token: string, skewMs = 60_000): boolean {
  try {
    const part = token.split(".")[1];
    if (!part) return true;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: number };
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 < Date.now() + skewMs;
  } catch {
    return true;
  }
}

export function getAccessToken(): string | undefined {
  return readCookie(ACCESS_COOKIE) || readLocal(ACCESS_STORAGE_KEY);
}

export function getRefreshToken(): string | undefined {
  // Prefer client-persisted refresh (required on Capacitor — HttpOnly cookies
  // often do not survive WebView process death across origins).
  return (
    readLocal(REFRESH_STORAGE_KEY) ||
    readCookie(REFRESH_COOKIE) ||
    readCookie("refreshToken")
  );
}

export function setTokens(accessToken: string, refreshToken?: string) {
  // Access JWT itself expires in ~15m; cookie/local keep the string for 7d
  // so we can refresh using the refresh token without forcing re-login.
  writeCookie(ACCESS_COOKIE, accessToken, 7);
  writeLocal(ACCESS_STORAGE_KEY, accessToken);
  void persistNativeKey(ACCESS_STORAGE_KEY, accessToken);

  if (refreshToken) {
    writeLocal(REFRESH_STORAGE_KEY, refreshToken);
    void persistNativeKey(REFRESH_STORAGE_KEY, refreshToken);
  }
}

export function clearTokens() {
  removeCookie(ACCESS_COOKIE);
  removeCookie(REFRESH_COOKIE);
  removeCookie("refreshToken");
  clearLocal(ACCESS_STORAGE_KEY);
  clearLocal(REFRESH_STORAGE_KEY);
  void persistNativeKey(ACCESS_STORAGE_KEY, null);
  void persistNativeKey(REFRESH_STORAGE_KEY, null);
}

/** Pull tokens from Capacitor Preferences into localStorage before auth hydrate. */
export async function hydrateNativeAuthTokens(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { Preferences } = await import("@capacitor/preferences");
    const [access, refresh] = await Promise.all([
      Preferences.get({ key: ACCESS_STORAGE_KEY }),
      Preferences.get({ key: REFRESH_STORAGE_KEY }),
    ]);
    if (access.value && !readLocal(ACCESS_STORAGE_KEY)) {
      writeLocal(ACCESS_STORAGE_KEY, access.value);
    }
    if (refresh.value && !readLocal(REFRESH_STORAGE_KEY)) {
      writeLocal(REFRESH_STORAGE_KEY, refresh.value);
    }
  } catch {
    /* ignore */
  }
}

async function postRefresh(
  refreshToken?: string,
): Promise<{ accessToken: string; refreshToken?: string }> {
  const res = await axios.post<
    ApiResponse<{ accessToken: string; refreshToken?: string }>
  >(
    `${getApiBaseUrl()}/auth/refresh-token`,
    refreshToken ? { refreshToken } : {},
    { withCredentials: true, timeout: 90_000 },
  );
  if (res.data?.status === "Error" || !res.data?.data?.accessToken) {
    throw new Error(res.data?.message || "Refresh failed");
  }
  return res.data.data;
}

/** Refresh access token using stored refresh token (and/or HttpOnly cookie). */
export async function refreshSession(): Promise<string> {
  const tokens = await postRefresh(getRefreshToken());
  setTokens(tokens.accessToken, tokens.refreshToken);
  return tokens.accessToken;
}

/**
 * Ensure we have a usable access token after cold start.
 * Uses the 7-day refresh token so the user is not bounced to sign-in
 * every time the Android WebView process is killed.
 */
export async function ensureSession(): Promise<boolean> {
  await hydrateNativeAuthTokens();
  const access = getAccessToken();
  const refresh = getRefreshToken();

  if (access && !isJwtExpired(access)) return true;

  if (!refresh && !access) return false;

  try {
    await refreshSession();
    return true;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearTokens();
      return false;
    }
    // Network / cold-start errors: keep tokens so offline UX still works.
    return Boolean(getAccessToken() || getRefreshToken());
  }
}

type AuthFailureHandler = (() => void) | null;
let authFailureHandler: AuthFailureHandler = null;

type TrackedRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _activityTracked?: boolean;
};

function finishApiRequest(config?: TrackedRequestConfig) {
  if (!config?._activityTracked) return;
  config._activityTracked = false;
  endApiActivity();
}

export function registerAuthFailureHandler(handler: AuthFailureHandler) {
  authFailureHandler = handler;
}

function createClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: getApiBaseUrl(),
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
    timeout: 90_000,
  });

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      config.baseURL = getApiBaseUrl();
      const trackedConfig = config as TrackedRequestConfig;
      if (!trackedConfig._activityTracked) {
        beginApiActivity();
        trackedConfig._activityTracked = true;
      }
      if (!(config.headers instanceof axios.AxiosHeaders)) {
        config.headers = new axios.AxiosHeaders(config.headers);
      }
      const token = getAccessToken();
      if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
      }
      if (typeof window !== "undefined") {
        config.headers.set("X-Opal-Client", getClientPlatform().code);
      }
      if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        config.headers.delete("Content-Type");
      }
      return config;
    },
  );

  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      finishApiRequest(response.config as TrackedRequestConfig);
      return response;
    },
    async (error) => {
      const original = error.config as TrackedRequestConfig | undefined;
      finishApiRequest(original);
      if (
        error.response?.status !== 401 ||
        !original ||
        original._retry ||
        String(original.url || "").includes("/auth/refresh-token")
      ) {
        return Promise.reject(error);
      }

      original._retry = true;
      beginApiActivity();
      try {
        const accessToken = await refreshSession();
        if (!(original.headers instanceof axios.AxiosHeaders)) {
          original.headers = new axios.AxiosHeaders(original.headers);
        }
        original.headers.set("Authorization", `Bearer ${accessToken}`);
        return instance(original);
      } catch {
        clearTokens();
        authFailureHandler?.();
        if (typeof window !== "undefined") {
          localStorage.removeItem("expense-tracker:user");
          window.location.assign("/signin?session=expired");
        }
        return Promise.reject(error);
      } finally {
        endApiActivity();
      }
    },
  );

  return instance;
}

export const api = createClient();

export function unwrap<T>(response: AxiosResponse<ApiResponse<T>>): T {
  const body = response.data;
  if (body?.status === "Error") {
    throw new Error(body.message || "Request failed");
  }
  return body.data;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      const base = getApiBaseUrl();
      if (isLocalhostApiUrl(base)) {
        return `Cannot reach API at ${base}. This phone build points at localhost — rebuild with your Render URL or set it in Settings → Offline & Sync.`;
      }
      return (
        error.message ||
        `Cannot reach ${base}. Check mobile data / Wi‑Fi, and that the server is awake.`
      );
    }
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (Array.isArray(data?.message)) {
      return data.message.filter(Boolean).join(", ") || fallback;
    }
    return data?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
