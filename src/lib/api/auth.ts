import axios from "axios";
import { api, setTokens, unwrap } from "./client";
import type { AuthTokens, User } from "@/types";

export type OtherLogin = {
  user_agent: string | null;
  created_at: string | null;
  last_used_at: string | null;
};

/** Sessions still open after a correct password, before this device is signed in. */
export function getActiveSessions(error: unknown): OtherLogin[] | null {
  if (!axios.isAxiosError(error)) return null;
  const body = error.response?.data as
    | { data?: { code?: string; sessions?: OtherLogin[] } }
    | undefined;
  if (body?.data?.code !== "ACTIVE_SESSION") return null;
  const sessions = body.data.sessions;
  return Array.isArray(sessions) ? sessions : [];
}

export async function registerUser(payload: {
  full_name: string;
  email: string;
  password: string;
  confirmPassword: string;
  country: string;
  currency?: string;
}): Promise<
  User & {
    message?: string;
    requires_email_verification?: boolean;
  }
> {
  const res = await api.post("/auth/register", payload);
  return unwrap<
    User & {
      message?: string;
      requires_email_verification?: boolean;
    }
  >(res);
}

export async function loginUser(payload: {
  email: string;
  password: string;
  /** Log out every other device. Only after the sign-in prompt. */
  replaceOtherSessions?: boolean;
}): Promise<AuthTokens & { user?: User }> {
  const res = await api.post("/auth/login", {
    email: payload.email,
    password: payload.password,
    ...(payload.replaceOtherSessions ? { replace_other_sessions: true } : {}),
  });
  const data = unwrap<AuthTokens & { user?: User }>(res);
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function verifyEmail(token: string) {
  const res = await api.post("/auth/verify-email", { token });
  return unwrap<{ message: string; email?: string }>(res);
}

export async function resendVerification(email: string) {
  const res = await api.post("/auth/resend-verification", { email });
  return unwrap<{ message: string }>(res);
}

export async function generateOtp(email: string) {
  const res = await api.post("/auth/generate-otp", { email });
  return unwrap<{
    message: string;
    delivery?: "email" | "inline";
    recovery_code?: string;
  }>(res);
}

export async function verifyRecoveryOtp(payload: {
  email: string;
  otp: string;
}) {
  const res = await api.post("/auth/verify-otp", payload);
  return unwrap<{ message: string; reset_token: string }>(res);
}

export async function resetPassword(payload: {
  email: string;
  newPassword: string;
  confirmNewPassword: string;
  resetToken: string;
}) {
  const res = await api.post("/auth/reset-password", payload);
  return unwrap<{ message: string }>(res);
}
