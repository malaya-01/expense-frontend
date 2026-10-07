import {
  api,
  getApiBaseUrl,
  getRefreshToken,
  isRetryableWriteError,
  unwrap,
} from "./client";
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
  /** Merged into users.preferences server-side. */
  preferences?: Record<string, unknown>;
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
  // Honour the runtime API override (Settings / Capacitor), not just the build env.
  const origin = getApiBaseUrl().replace(/\/api\/?$/, "");
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
    } catch (error) {
      // Queue only when the server never got it; real errors go to the UI.
      if (!isRetryableWriteError(error)) throw error;
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

export async function getNotificationPreferences(): Promise<{
  preferences: Record<string, unknown>;
}> {
  const res = await api.get("/user/notification-preferences");
  return unwrap<{ preferences: Record<string, unknown> }>(res);
}

export async function patchNotificationPreferences(
  preferences: Record<string, unknown>,
): Promise<{ preferences: Record<string, unknown> }> {
  const res = await api.patch("/user/notification-preferences", preferences);
  return unwrap<{ preferences: Record<string, unknown> }>(res);
}

export type ThemePreferencesPayload = {
  active_theme_id: string | null;
  custom_themes: unknown[];
  has_preference?: boolean;
};

export async function getThemePreferences(): Promise<ThemePreferencesPayload> {
  const res = await api.get("/user/theme-preferences");
  return unwrap<ThemePreferencesPayload>(res);
}

export async function saveThemePreferences(payload: {
  active_theme_id: string;
  custom_themes: unknown[];
}): Promise<ThemePreferencesPayload> {
  const res = await api.put("/user/theme-preferences", payload);
  return unwrap<ThemePreferencesPayload>(res);
}

/* ------------------------------ Preferences ------------------------------ */

export type PreferencesPayload = {
  preferences: Record<string, unknown>;
  updated_at?: string;
};

export async function getPreferences(): Promise<PreferencesPayload> {
  const res = await api.get("/user/preferences");
  return unwrap<PreferencesPayload>(res);
}

/**
 * Save preferences. Online: PATCH /user/preferences. Offline (or the request
 * never reached the server): queued through the existing `user_settings`
 * offline entity, which the sync engine pushes to PATCH /user/profile.
 */
export async function savePreferences(
  userId: string,
  preferences: Record<string, unknown>,
): Promise<{ preferences: Record<string, unknown>; queued: boolean }> {
  if (isOnline()) {
    try {
      const res = await api.patch("/user/preferences", preferences);
      const data = unwrap<PreferencesPayload>(res);
      return { preferences: data.preferences, queued: false };
    } catch (error) {
      if (!isRetryableWriteError(error)) throw error;
    }
  }
  await saveUserSettingsLocal(userId, { preferences });
  return { preferences, queued: true };
}

/* -------------------------------- Sessions ------------------------------- */

export type UserSession = {
  id: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  current: boolean;
};

async function sha256Hex(value: string): Promise<string | null> {
  try {
    if (!globalThis.crypto?.subtle) return null;
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    );
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

export async function listSessions(): Promise<UserSession[]> {
  const token = getRefreshToken();
  // Only the hash (as stored server-side) is sent, never the token itself.
  const current = token ? await sha256Hex(token) : null;
  const res = await api.get("/user/sessions", {
    params: current ? { current } : undefined,
  });
  return unwrap<UserSession[]>(res);
}

export async function revokeSession(id: string): Promise<void> {
  await api.delete(`/user/sessions/${encodeURIComponent(id)}`);
}

export async function revokeOtherSessions(): Promise<{ revoked: number }> {
  const refreshToken = getRefreshToken();
  const res = await api.post(
    "/user/sessions/revoke-others",
    refreshToken ? { refreshToken } : {},
  );
  return unwrap<{ revoked: number }>(res);
}

/* ---------------------------- Account deletion --------------------------- */

export async function deleteAccount(payload: {
  password: string;
  confirmation: string;
}): Promise<void> {
  await api.post("/user/delete-account", payload);
}
