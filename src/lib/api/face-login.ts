import { api, setTokens, unwrap } from "./client";
import type { AuthTokens, User } from "@/types";

export type FaceLoginStatus = {
  enabled: boolean;
  email: string | null;
};

export async function getFaceLoginStatus(): Promise<FaceLoginStatus> {
  const res = await api.get("/user/face-login");
  return unwrap<FaceLoginStatus>(res);
}

export async function saveFaceLogin(descriptor: number[]): Promise<FaceLoginStatus> {
  const res = await api.put("/user/face-login", { descriptor });
  return unwrap<FaceLoginStatus>(res);
}

export async function deleteFaceLogin(): Promise<{ enabled: boolean }> {
  const res = await api.delete("/user/face-login");
  return unwrap<{ enabled: boolean }>(res);
}

export async function faceLoginAvailable(): Promise<{ enabled: boolean }> {
  const res = await api.get("/auth/face-login/available");
  return unwrap<{ enabled: boolean }>(res);
}

export async function loginWithFace(descriptor: number[]) {
  const res = await api.post("/auth/face-login", { descriptor });
  const data = unwrap<AuthTokens & { user?: User }>(res);
  setTokens(data.accessToken, data.refreshToken);
  return data;
}
