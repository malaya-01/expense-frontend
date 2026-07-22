import { api, setTokens, unwrap } from "./client";
import type { AuthTokens, User } from "@/types";

export async function registerUser(payload: {
  full_name: string;
  email: string;
  password: string;
  confirmPassword: string;
  country: string;
  currency?: string;
}): Promise<User & { message?: string }> {
  const res = await api.post("/auth/register", payload);
  return unwrap<User & { message?: string }>(res);
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthTokens & { user?: User }> {
  const res = await api.post("/auth/login", payload);
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
  return unwrap<{ message: string }>(res);
}

export async function resetPassword(payload: {
  email: string;
  newPassword: string;
  confirmNewPassword: string;
  otp: string;
}) {
  const res = await api.post("/auth/reset-password", payload);
  return unwrap<{ message: string }>(res);
}
