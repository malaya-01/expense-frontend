import {
  API_BASE_STORAGE_KEY,
  clearTokens,
  revokeServerSession,
} from "@/lib/api/client";
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
  // Custom themes are NOT kept: themes/sync.ts seeds a new account's backend
  // from local theme state, which would leak this user's themes to the next.
  // (The logout listener resets the active theme to a preset.)
  const keep = new Set([
    API_BASE_STORAGE_KEY,
    "expense-tracker:active-theme-id",
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
  // Bump the sync epoch first so a run in flight cannot write into the
  // tables after they are cleared.
  resetOfflineSyncRuntime();
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
  try {
    // Separate "finos-spaces-outbox" IndexedDB — drafts must not be flushed
    // under the next account.
    const { clearSpaceDrafts } = await import("@/lib/spaces/offline-outbox");
    await clearSpaceDrafts();
  } catch {
    /* ignore */
  }
  activeUserId = null;
}

/**
 * Explicit sign-out: revoke the server session, then wipe tokens, cookies,
 * IndexedDB (incl. the spaces drafts DB), and account backups for this device.
 * Session expiry must NOT call this — it would drop unsynced work.
 */
export async function clearAccountLocalData(
  userId?: string | null,
): Promise<void> {
  // Needs the refresh token, so it must run before clearTokens().
  await revokeServerSession(5_000);
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
