import { API_BASE_STORAGE_KEY, clearTokens } from "@/lib/api/client";
import { USER_STORAGE_KEY } from "@/lib/store/slices/authSlice";
import { DISMISSED_NOTIFICATIONS_KEY } from "@/lib/store/slices/notificationsSlice";
import { getMeta, offlineDb, setMeta } from "./db";
import { clearDurableBackup } from "./durable-backup";
import { resetOfflineSyncRuntime } from "./sync-engine";

const ACTIVE_USER_META = "active_user_id";

let activeUserId: string | null = null;

export function getActiveOfflineUserId(): string | null {
  return activeUserId;
}

export function setActiveOfflineUserId(userId: string | null) {
  activeUserId = userId;
}

function wipeAuthCookies() {
  if (typeof document === "undefined") return;
  const names = document.cookie
    .split(";")
    .map((part) => part.split("=")[0]?.trim())
    .filter(Boolean);
  for (const name of names) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
  }
}

function wipeAccountStorage() {
  if (typeof window === "undefined") return;
  const keep = new Set([
    API_BASE_STORAGE_KEY,
    "expense-tracker:active-theme-id",
    "expense-tracker:custom-themes",
    "finos:sidebar-pinned",
    "finos:sidebar-width",
  ]);
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key) keys.push(key);
  }
  for (const key of keys) {
    if (keep.has(key)) continue;
    if (
      key.startsWith("finos:") ||
      key.startsWith("expense-tracker:") ||
      key === USER_STORAGE_KEY ||
      key === DISMISSED_NOTIFICATIONS_KEY
    ) {
      localStorage.removeItem(key);
    }
  }
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
}

export async function clearOfflineTables(): Promise<void> {
  await Promise.all(offlineDb.tables.map((table) => table.clear()));
  resetOfflineSyncRuntime();
}

async function clearOfflineWorkspace(userId?: string | null): Promise<void> {
  try {
    if (userId) await clearDurableBackup(userId);
  } catch {
    /* ignore */
  }
  try {
    await clearOfflineTables();
  } catch {
    /* ignore */
  }
  activeUserId = null;
}

/** Wipe tokens, cookies, IndexedDB, and account backups for this device. */
export async function clearAccountLocalData(
  userId?: string | null,
): Promise<void> {
  const uid =
    userId ||
    activeUserId ||
    (await getMeta(ACTIVE_USER_META).catch(() => null));
  await clearOfflineWorkspace(uid);
  clearTokens();
  wipeAuthCookies();
  wipeAccountStorage();
}

/** Bind Dexie to one account. Clears local data when the user id changes. */
export async function switchOfflineUser(nextUserId: string): Promise<void> {
  const prev =
    activeUserId || (await getMeta(ACTIVE_USER_META).catch(() => null));
  if (prev && prev !== nextUserId) {
    await clearOfflineWorkspace(prev);
  }
  activeUserId = nextUserId;
  try {
    await setMeta(ACTIVE_USER_META, nextUserId);
  } catch {
    /* ignore */
  }
}
