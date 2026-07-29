/**
 * Durable backup of unsynced offline data.
 *
 * Android deletes IndexedDB on uninstall. To keep pending work:
 * 1. Mirror into Capacitor Preferences (survives via Google Auto Backup on reinstall)
 * 2. On native, also write Documents/FinOS/pending-<userId>.json on shared storage
 *
 * After sync succeeds and the outbox is empty, both copies are removed.
 */

import { Capacitor } from "@capacitor/core";
import {
  ENTITY_TABLE,
  getMeta,
  offlineDb,
  setMeta,
  type EntityTableName,
  type OutboxItem,
  type SyncedRecord,
} from "./db";

export const DURABLE_BACKUP_VERSION = 1 as const;
const PREFS_KEY_PREFIX = "finos_durable_backup_";
const FILE_DIR = "FinOS";
const APP_SALT = "finos-durable-backup-v1";
const META_USER_KEY = "backup_user_id";

export type DurableBackupPayload = {
  version: typeof DURABLE_BACKUP_VERSION;
  user_id: string;
  updated_at: string;
  outbox: OutboxItem[];
  entities: Partial<Record<EntityTableName, SyncedRecord[]>>;
};

let backupTimer: ReturnType<typeof setTimeout> | null = null;
let lastUserId: string | null = null;

async function resolveUserId(userId?: string | null): Promise<string | null> {
  if (userId) return userId;
  if (lastUserId) return lastUserId;
  return getMeta(META_USER_KEY);
}

function prefsKey(userId: string) {
  return `${PREFS_KEY_PREFIX}${userId}`;
}

function fileName(userId: string) {
  return `${FILE_DIR}/pending-${userId}.json`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveKey(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    enc.encode(`${APP_SALT}:${userId}`),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(APP_SALT),
      iterations: 100_000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptPayload(
  userId: string,
  json: string,
): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return `plain:${bytesToBase64(new TextEncoder().encode(json))}`;
  }
  const key = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(json),
  );
  const packed = new Uint8Array(iv.length + cipher.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(cipher), iv.length);
  return `v1:${bytesToBase64(packed)}`;
}

async function decryptPayload(
  userId: string,
  blob: string,
): Promise<string | null> {
  try {
    if (blob.startsWith("plain:")) {
      return new TextDecoder().decode(base64ToBytes(blob.slice(6)));
    }
    if (!blob.startsWith("v1:") || !crypto.subtle) return null;
    const packed = base64ToBytes(blob.slice(3));
    const iv = packed.slice(0, 12);
    const data = packed.slice(12);
    const key = await deriveKey(userId);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

async function collectBackup(userId: string): Promise<DurableBackupPayload | null> {
  const outbox = await offlineDb.outbox
    .where("status")
    .anyOf(["pending", "failed", "syncing"])
    .toArray();

  if (!outbox.length) return null;

  const entities: DurableBackupPayload["entities"] = {};
  const byTable = new Map<EntityTableName, Set<string>>();

  for (const item of outbox) {
    const table = ENTITY_TABLE[item.entity_type as keyof typeof ENTITY_TABLE];
    if (!table) continue;
    if (!byTable.has(table)) byTable.set(table, new Set());
    byTable.get(table)!.add(item.entity_id);
  }

  // Also keep any locally pending rows even if outbox entry is odd.
  for (const table of Object.values(ENTITY_TABLE)) {
    const pendingRows = (await offlineDb.table(table).toArray()).filter(
      (row: SyncedRecord) => row._pending || row._sync_failed,
    );
    if (!pendingRows.length && !byTable.has(table)) continue;
    const ids = byTable.get(table) || new Set<string>();
    for (const row of pendingRows) ids.add(String(row.id));
    const rows: SyncedRecord[] = [];
    for (const id of ids) {
      const row = (await offlineDb.table(table).get(id)) as
        | SyncedRecord
        | undefined;
      if (row) rows.push(row);
    }
    if (rows.length) entities[table] = rows;
  }

  return {
    version: DURABLE_BACKUP_VERSION,
    user_id: userId,
    updated_at: new Date().toISOString(),
    outbox: outbox.map(({ id: _id, ...rest }) => rest),
    entities,
  };
}

async function writePreferences(userId: string, encrypted: string) {
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.set({ key: prefsKey(userId), value: encrypted });
}

async function readPreferences(userId: string): Promise<string | null> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: prefsKey(userId) });
    return value;
  } catch {
    return null;
  }
}

async function clearPreferences(userId: string) {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key: prefsKey(userId) });
  } catch {
    /* ignore */
  }
}

async function writeSharedFile(userId: string, encrypted: string) {
  if (!Capacitor.isNativePlatform()) return;
  const { Directory, Encoding, Filesystem } = await import(
    "@capacitor/filesystem"
  );
  const directories = [Directory.ExternalStorage, Directory.Documents, Directory.Data];
  for (const directory of directories) {
    try {
      await Filesystem.mkdir({
        path: FILE_DIR,
        directory,
        recursive: true,
      }).catch(() => undefined);
      await Filesystem.writeFile({
        path: fileName(userId),
        data: encrypted,
        directory,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      // ExternalStorage survives uninstall best; Documents/Data are fallbacks.
      if (directory === Directory.ExternalStorage) return;
      // Keep trying ExternalStorage first only — if we wrote Documents/Data, still ok.
      return;
    } catch {
      /* try next */
    }
  }
}

async function readSharedFile(userId: string): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const { Directory, Encoding, Filesystem } = await import(
    "@capacitor/filesystem"
  );
  for (const directory of [
    Directory.ExternalStorage,
    Directory.Documents,
    Directory.Data,
  ]) {
    try {
      const result = await Filesystem.readFile({
        path: fileName(userId),
        directory,
        encoding: Encoding.UTF8,
      });
      if (typeof result.data === "string" && result.data) return result.data;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function clearSharedFile(userId: string) {
  if (!Capacitor.isNativePlatform()) return;
  const { Directory, Filesystem } = await import("@capacitor/filesystem");
  for (const directory of [
    Directory.ExternalStorage,
    Directory.Documents,
    Directory.Data,
  ]) {
    try {
      await Filesystem.deleteFile({
        path: fileName(userId),
        directory,
      });
    } catch {
      /* ignore */
    }
  }
}

/** Persist current unsynced work (or clear backup when nothing pending). */
export async function persistDurableBackup(userId?: string | null): Promise<void> {
  const uid = await resolveUserId(userId);
  if (!uid || typeof window === "undefined") return;
  lastUserId = uid;

  const payload = await collectBackup(uid);
  if (!payload) {
    await clearPreferences(uid);
    await clearSharedFile(uid);
    return;
  }

  const encrypted = await encryptPayload(uid, JSON.stringify(payload));
  await writePreferences(uid, encrypted);
  await writeSharedFile(uid, encrypted);
}

/** Debounced write — call after outbox changes. */
export function scheduleDurableBackup(userId?: string | null): void {
  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(() => {
    void persistDurableBackup(userId);
  }, 600);
}

export function bindDurableBackupUser(userId: string | null | undefined): void {
  lastUserId = userId || null;
  if (userId) void setMeta(META_USER_KEY, userId);
}

async function loadEncryptedBlob(userId: string): Promise<string | null> {
  return (
    (await readSharedFile(userId)) ||
    (await readPreferences(userId))
  );
}

/**
 * Restore unsynced rows after reinstall / cleared WebView storage.
 * Safe to call on every login — no-ops when local outbox already has work
 * or when no backup exists.
 */
export async function restoreDurableBackup(
  userId: string,
): Promise<{ restored: number; from: "file" | "preferences" | null }> {
  if (!userId || typeof window === "undefined") {
    return { restored: 0, from: null };
  }
  lastUserId = userId;

  const existingPending = await offlineDb.outbox
    .where("status")
    .anyOf(["pending", "failed", "syncing"])
    .count();
  if (existingPending > 0) {
    // Local DB already has work — refresh durable copy and exit.
    await persistDurableBackup(userId);
    return { restored: 0, from: null };
  }

  const fromFile = await readSharedFile(userId);
  const fromPrefs = fromFile ? null : await readPreferences(userId);
  const blob = fromFile || fromPrefs;
  if (!blob) return { restored: 0, from: null };

  const json = await decryptPayload(userId, blob);
  if (!json) return { restored: 0, from: null };

  let payload: DurableBackupPayload;
  try {
    payload = JSON.parse(json) as DurableBackupPayload;
  } catch {
    return { restored: 0, from: null };
  }

  if (
    payload.version !== DURABLE_BACKUP_VERSION ||
    payload.user_id !== userId ||
    !Array.isArray(payload.outbox) ||
    !payload.outbox.length
  ) {
    return { restored: 0, from: null };
  }

  // Restore entity rows first so UI has names/amounts.
  for (const [table, rows] of Object.entries(payload.entities || {})) {
    if (!rows?.length) continue;
    await offlineDb.transaction("rw", offlineDb.table(table), async () => {
      for (const row of rows) {
        const id = String(row.id);
        const existing = (await offlineDb.table(table).get(id)) as
          | SyncedRecord
          | undefined;
        if (existing && !existing._pending && !existing._sync_failed) continue;
        await offlineDb.table(table).put({
          ...row,
          id,
          _pending: true,
        } as SyncedRecord);
      }
    });
  }

  let restored = 0;
  for (const item of payload.outbox) {
    const duplicate = await offlineDb.outbox
      .where("client_op_id")
      .equals(item.client_op_id)
      .first();
    if (duplicate) continue;
    const { id: _omit, ...rest } = item as OutboxItem & { id?: number };
    await offlineDb.outbox.add({
      ...rest,
      status:
        rest.status === "synced" || rest.status === "cancelled"
          ? "pending"
          : rest.status === "syncing"
            ? "failed"
            : rest.status,
      next_retry_at: null,
      updated_at: new Date().toISOString(),
    });
    restored += 1;
  }

  if (restored > 0) {
    await persistDurableBackup(userId);
  }

  return {
    restored,
    from: fromFile ? "file" : "preferences",
  };
}

export async function clearDurableBackup(userId?: string | null): Promise<void> {
  const uid = await resolveUserId(userId);
  if (!uid) return;
  await clearPreferences(uid);
  await clearSharedFile(uid);
}

export function durableBackupPathHint(userId: string): string {
  return `Android shared storage → ${fileName(userId)}`;
}
