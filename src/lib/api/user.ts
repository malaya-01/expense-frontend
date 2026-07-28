import { api, unwrap } from "./client";
import type { User } from "@/types";
import { saveUserSettingsLocal } from "@/lib/offline/repos";
import { isOnline } from "@/lib/offline/network";
import { offlineDb } from "@/lib/offline/db";

export type UpdateProfileInput = {
  full_name?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  locale?: string;
};

/** Turn a stored avatar path into a browser-loadable URL. */
export function resolveAvatarUrl(
  avatarUrl: string | null | undefined,
): string | null {
  if (!avatarUrl) return null;
  if (
    avatarUrl.startsWith("data:") ||
    avatarUrl.startsWith("http://") ||
    avatarUrl.startsWith("https://") ||
    avatarUrl.startsWith("blob:")
  ) {
    return avatarUrl;
  }
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`}`;
}

export async function getCurrentUser(): Promise<User> {
  try {
    const res = await api.get("/user");
    const user = unwrap<User>(res);
    await offlineDb.user_settings.put({
      ...user,
      id: user.id,
      _pending: false,
    } as any);
    return user;
  } catch {
    const rows = await offlineDb.user_settings.toArray();
    if (rows[0]) return rows[0] as unknown as User;
    throw new Error("User unavailable offline");
  }
}

export async function updateProfile(payload: UpdateProfileInput): Promise<User> {
  let userId: string | undefined;
  try {
    const current = await getCurrentUser();
    userId = current.id;
  } catch {
    const rows = await offlineDb.user_settings.toArray();
    userId = rows[0]?.id as string | undefined;
  }
  if (!userId) throw new Error("User id required");

  if (isOnline()) {
    try {
      const res = await api.patch("/user/profile", payload);
      const user = unwrap<User>(res);
      await offlineDb.user_settings.put({
        ...user,
        id: user.id,
        _pending: false,
      } as any);
      return user;
    } catch {
      /* fall through */
    }
  }
  const local = await saveUserSettingsLocal(userId, payload as any);
  return local as unknown as User;
}

export async function uploadAvatar(file: File): Promise<User> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be under 5MB");
  }
  const form = new FormData();
  form.append("avatar", file);
  const res = await api.post("/user/avatar", form);
  return unwrap<User>(res);
}

export async function removeAvatar(): Promise<User> {
  const res = await api.delete("/user/avatar");
  return unwrap<User>(res);
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}): Promise<{ message: string }> {
  const res = await api.patch("/user/password", payload);
  return unwrap<{ message: string }>(res);
}
