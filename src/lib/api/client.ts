import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import type { ApiResponse } from "@/types";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

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

export function getAccessToken(): string | undefined {
  return readCookie(ACCESS_COOKIE);
}

export function setTokens(accessToken: string, _refreshToken?: string) {
  writeCookie(ACCESS_COOKIE, accessToken, 2);
  // Refresh tokens remain in the server-issued HttpOnly cookie.
  removeCookie(REFRESH_COOKIE);
}

export function clearTokens() {
  removeCookie(ACCESS_COOKIE);
  removeCookie(REFRESH_COOKIE);
}

function createClient(): AxiosInstance {
  const instance = axios.create({
    baseURL:
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000/api",
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
  });

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      if (!(config.headers instanceof axios.AxiosHeaders)) {
        config.headers = new axios.AxiosHeaders(config.headers);
      }
      const token = getAccessToken();
      if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
      }
      return config;
    },
  );

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
      const original = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | undefined;
      if (
        error.response?.status !== 401 ||
        !original ||
        original._retry ||
        String(original.url || "").includes("/auth/refresh-token")
      ) {
        return Promise.reject(error);
      }

      original._retry = true;
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
        if (typeof window !== "undefined") {
          localStorage.removeItem("expense-tracker:user");
          window.location.assign("/signin?session=expired");
        }
        return Promise.reject(error);
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
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
