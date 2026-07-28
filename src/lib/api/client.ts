import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import type { ApiResponse } from "@/types";
import { beginApiActivity, endApiActivity } from "@/lib/api/activity";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";
const ACCESS_STORAGE_KEY = "finos:access_token";
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
  // `api` is created below; update if already initialized.
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

function readLocalToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return localStorage.getItem(ACCESS_STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
}

function writeLocalToken(value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCESS_STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
  void persistNativeToken(value);
}

function clearLocalToken() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACCESS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  void persistNativeToken(null);
}

async function persistNativeToken(value: string | null) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { Preferences } = await import("@capacitor/preferences");
    if (value) {
      await Preferences.set({ key: ACCESS_STORAGE_KEY, value });
    } else {
      await Preferences.remove({ key: ACCESS_STORAGE_KEY });
    }
  } catch {
    /* Capacitor optional at build time */
  }
}

export function getAccessToken(): string | undefined {
  return readCookie(ACCESS_COOKIE) || readLocalToken();
}

export function setTokens(accessToken: string, _refreshToken?: string) {
  writeCookie(ACCESS_COOKIE, accessToken, 2);
  writeLocalToken(accessToken);
  // Refresh tokens remain in the server-issued HttpOnly cookie.
  removeCookie(REFRESH_COOKIE);
}

export function clearTokens() {
  removeCookie(ACCESS_COOKIE);
  removeCookie(REFRESH_COOKIE);
  clearLocalToken();
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
    // Free-tier backends (e.g. Render) can take a long time to wake.
    timeout: 90_000,
  });

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      // Always use latest runtime override (Capacitor / settings).
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
        const refresh = await axios.post<
          ApiResponse<{ accessToken: string; refreshToken?: string }>
        >(
          `${instance.defaults.baseURL}/auth/refresh-token`,
          {},
          { withCredentials: true },
        );
        const tokens = refresh.data.data;
        setTokens(tokens.accessToken, tokens.refreshToken);
        original.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
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
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
