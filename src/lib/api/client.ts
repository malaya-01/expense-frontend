import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import Cookies from "js-cookie";
import type { ApiResponse } from "@/types";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

export function getAccessToken(): string | undefined {
  return Cookies.get(ACCESS_COOKIE);
}

export function setTokens(accessToken: string, refreshToken?: string) {
  Cookies.set(ACCESS_COOKIE, accessToken, { expires: 2, sameSite: "lax" });
  if (refreshToken) {
    Cookies.set(REFRESH_COOKIE, refreshToken, { expires: 7, sameSite: "lax" });
  }
}

export function clearTokens() {
  Cookies.remove(ACCESS_COOKIE);
  Cookies.remove(REFRESH_COOKIE);
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
    (error) => Promise.reject(error),
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
