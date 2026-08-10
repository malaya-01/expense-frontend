import { api, unwrap } from "@/lib/api/client";
import {
  ENTITY_TABLE,
  getOrCreateDeviceId,
  getMeta,
  offlineDb,
  setMeta,
  type EntityTableName,
  type SyncEntityType,
} from "./db";
import { addConflict } from "./conflicts";
import { isOnline } from "./network";
import {
  listPendingOutbox,
  markOutboxFailed,
  markOutboxSynced,
  markOutboxSyncing,
  recoverStuckSyncing,
  requeueAllFailed,
} from "./outbox";
import {
  hydrateViaRestLists,
  isSyncApiMissing,
  pushOutboxItemViaRest,
} from "./rest-fallback";
import {
  bindDurableBackupUser,
  persistDurableBackup,
  restoreDurableBackup,
} from "./durable-backup";
import axios from "axios";

/** Free-tier hosts (Render) often need a long wake-up window. */
const SYNC_TIMEOUT_MS = 90_000;
const PUSH_BATCH_SIZE = 8;

export type SyncStatusSnapshot = {
  online: boolean;
  syncing: boolean;
  pending: number;
  failed: number;
  conflicts: number;
  lastSyncAt: string | null;
  lastError: string | null;
};

type SyncListener = (status: SyncStatusSnapshot) => void;

const listeners = new Set<SyncListener>();
let syncing = false;
let lastError: string | null = null;
let bootstrapped = false;
/** Once we know /api/sync is missing on the server, skip it and use REST. */
let useRestFallback = false;

type PushResult = {
  client_op_id: string;
  status: "applied" | "conflict" | "error" | "duplicate";
  server_row?: Record<string, unknown> | null;
  error?: string;
};

type PullPayload = {
  cursor: string;
  changes: Record<string, Record<string, unknown>[]>;
};

const TRANSACTION_KEYS = [
  "type",
  "amount",
  "description",
  "date",
  "category_id",
  "source_container_id",
  "destination_container_id",
  "merchant",
  "notes",
  "currency",
  "exchange_rate",
] as const;

function sanitizeOutboxPayload(
  entityType: string,
  payload: Record<string, unknown>,
  entityId: string,
): Record<string, unknown> {
  if (entityType === "transaction") {
    const clean: Record<string, unknown> = { id: entityId };
    for (const key of TRANSACTION_KEYS) {
      if (payload[key] !== undefined) clean[key] = payload[key];
    }
    return clean;
  }
  // Strip UI-only flags from any entity before push.
  const {
    _pending: _p,
    _sync_failed: _f,
    source_name: _sn,
    destination_name: _dn,
    category_name: _cn,
    source_currency: _sc,
    destination_currency: _dc,
    ...rest
  } = payload;
  return { ...rest, id: entityId };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                `${label} timed out after ${Math.round(ms / 1000)}s — server may be waking up. Will retry.`,
              ),
            ),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  void emitStatus();
  return () => listeners.delete(listener);
}

export async function emitStatus() {
  const [pending, failed, conflicts, lastSyncAt] = await Promise.all([
    offlineDb.outbox.where("status").anyOf(["pending", "syncing"]).count(),
    offlineDb.outbox.where("status").equals("failed").count(),
    offlineDb.conflicts.count(),
    getMeta("last_sync_at"),
  ]);
  const snapshot: SyncStatusSnapshot = {
    online: isOnline(),
    syncing,
    pending: pending + failed,
    failed,
    conflicts,
    lastSyncAt,
    lastError,
  };
  listeners.forEach((fn) => fn(snapshot));
}

export async function runSync(reason = "manual"): Promise<void> {
  if (syncing) return;
  if (!isOnline()) {
    await emitStatus();
    return;
  }

  syncing = true;
  lastError = null;
  await emitStatus();

  try {
    await recoverStuckSyncing();
    if (reason === "manual") {
      await requeueAllFailed();
    }
    await pushOutbox();
    await pullChanges();
    await setMeta("last_sync_at", new Date().toISOString());
    lastError = null;
    await persistDurableBackup();
  } catch (error: any) {
    lastError = error?.message || `Sync failed (${reason})`;
    // Never delete local data on sync failure — only requeue outbox.
    await recoverStuckSyncing();
    await persistDurableBackup();
  } finally {
    syncing = false;
    await emitStatus();
  }
}

async function pushOutbox() {
  // Dependency-friendly order: accounts/categories before transactions, etc.
  const priority: Record<string, number> = {
    category: 10,
    account: 20,
    budget: 30,
    goal: 30,
    investment: 30,
    loan: 30,
    recurring: 30,
    transaction: 40,
    goal_contribute: 50,
    loan_payment: 50,
    recurring_execute: 50,
    user_settings: 5,
    ai_preferences: 5,
    ai_memory: 5,
    notification_preferences: 5,
  };

  let pending = await listPendingOutbox(40);
  pending = pending.sort(
    (a, b) =>
      (priority[a.entity_type] ?? 100) - (priority[b.entity_type] ?? 100) ||
      a.created_at.localeCompare(b.created_at),
  );

  // Push in small batches so a cold-start timeout doesn't strand everything.
  for (let i = 0; i < pending.length; i += PUSH_BATCH_SIZE) {
    const batch = pending.slice(i, i + PUSH_BATCH_SIZE);
    await pushBatch(batch);
  }
}

async function pushBatch(
  pending: Awaited<ReturnType<typeof listPendingOutbox>>,
) {
  if (!pending.length) return;
  const ids = pending.map((p) => p.id!).filter(Boolean);
  await markOutboxSyncing(ids);

  if (useRestFallback) {
    await pushBatchViaRest(pending);
    return;
  }

  try {
    const deviceId = await getOrCreateDeviceId();
    const res = await withTimeout(
      api.post(
        "/sync/push",
        {
          device_id: deviceId,
          changes: pending.map((item) => ({
            client_op_id: item.client_op_id,
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            op: item.op,
            payload: sanitizeOutboxPayload(
              item.entity_type,
              item.payload,
              item.entity_id,
            ),
            client_updated_at: item.updated_at,
            base_sync_version: item.base_sync_version,
            force: item.force || false,
          })),
        },
        { timeout: SYNC_TIMEOUT_MS },
      ),
      SYNC_TIMEOUT_MS + 5_000,
      "Sync push",
    );
    const data = unwrap<{ results: PushResult[] }>(res);
    const byOp = new Map(data.results.map((r) => [r.client_op_id, r]));

    for (const item of pending) {
      const result = byOp.get(item.client_op_id);
      if (!item.id) continue;

      if (!result) {
        await markOutboxFailed(
          item.id,
          "No result from server — will retry",
          item.retry_count + 1,
        );
        await flagLocalFailed(item.entity_type, item.entity_id, true);
        continue;
      }

      if (result.status === "applied" || result.status === "duplicate") {
        if (result.server_row) {
          await applyServerRow(item.entity_type, result.server_row, item.entity_id);
        } else {
          await clearLocalPending(item.entity_type, item.entity_id);
        }
        await markOutboxSynced(item.id);
        continue;
      }

      if (result.status === "conflict" && result.server_row) {
        const local = await loadLocalRow(item.entity_type, item.entity_id);
        await addConflict({
          client_op_id: item.client_op_id,
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          local_row: local || item.payload,
          server_row: result.server_row,
        });
        await markOutboxSynced(item.id);
        continue;
      }

      await markOutboxFailed(
        item.id,
        result.error || "Push failed",
        item.retry_count + 1,
      );
      await flagLocalFailed(item.entity_type, item.entity_id, true);
    }
  } catch (error: any) {
    if (isSyncApiMissing(error) || axios.isAxiosError(error) && error.response?.status === 404) {
      useRestFallback = true;
      await pushBatchViaRest(pending);
      return;
    }
    for (const item of pending) {
      if (item.id == null) continue;
      await markOutboxFailed(
        item.id,
        error?.message || "Network error during sync",
        item.retry_count + 1,
      );
      await flagLocalFailed(item.entity_type, item.entity_id, true);
    }
    throw error;
  }
}

async function pushBatchViaRest(
  pending: Awaited<ReturnType<typeof listPendingOutbox>>,
) {
  for (const item of pending) {
    if (item.id == null) continue;
    try {
      const serverRow = await pushOutboxItemViaRest(item);
      if (serverRow) {
        const serverId = String(serverRow.id || item.entity_id);
        if (item.op === "create" && serverId !== item.entity_id) {
          await migrateLocalId(item.entity_type, item.entity_id, serverRow);
        } else {
          await applyServerRow(item.entity_type, serverRow, item.entity_id);
        }
      } else {
        await clearLocalPending(item.entity_type, item.entity_id);
      }
      await markOutboxSynced(item.id);
    } catch (error: any) {
      await markOutboxFailed(
        item.id,
        error?.message || "REST sync failed",
        item.retry_count + 1,
      );
      await flagLocalFailed(item.entity_type, item.entity_id, true);
    }
  }
}

async function migrateLocalId(
  entityType: SyncEntityType,
  oldId: string,
  serverRow: Record<string, unknown>,
) {
  const tableName = ENTITY_TABLE[entityType as keyof typeof ENTITY_TABLE];
  if (!tableName) return;
  const newId = String(serverRow.id);
  const existing = (await offlineDb.table(tableName).get(oldId)) as
    | Record<string, unknown>
    | undefined;
  await offlineDb.table(tableName).delete(oldId);
  await offlineDb.table(tableName).put({
    ...(existing || {}),
    ...serverRow,
    id: newId,
    _pending: false,
    _sync_failed: false,
  });
}

async function pullChanges() {
  if (useRestFallback) {
    await hydrateViaRestLists();
    return;
  }

  try {
    const deviceId = await getOrCreateDeviceId();
    const since = (await getMeta("pull_cursor")) || undefined;
    const res = await withTimeout(
      api.get("/sync/pull", {
        params: { since, device_id: deviceId },
        timeout: SYNC_TIMEOUT_MS,
      }),
      SYNC_TIMEOUT_MS + 5_000,
      "Sync pull",
    );
    const data = unwrap<PullPayload>(res);
    const changes = data.changes || {};

    await mergePull("accounts", changes.accounts);
    await mergePull("transactions", changes.transactions);
    await mergePull("categories", changes.categories);
    await mergePull("budgets", changes.budgets);
    await mergePull("goals", changes.goals);
    await mergePull("investments", changes.investments);
    await mergePull("loans", changes.loans);
    await mergePull("recurring", changes.recurring);
    await mergePullUserSettings(changes.user_settings);
    await mergePullAiPreferences(changes.ai_preferences);
    await mergePull("ai_memories", changes.ai_memories);
    await mergePullNotificationPrefs(changes.notification_preferences);

    if (data.cursor) await setMeta("pull_cursor", data.cursor);
  } catch (error: any) {
    if (isSyncApiMissing(error) || (axios.isAxiosError(error) && error.response?.status === 404)) {
      useRestFallback = true;
      await hydrateViaRestLists();
      return;
    }
    throw error;
  }
}

async function mergePull(
  table: EntityTableName,
  rows: Record<string, unknown>[] | undefined,
) {
  if (!rows?.length) return;
  await offlineDb.transaction("rw", offlineDb.table(table), async () => {
    for (const row of rows) {
      const id = String(row.id);
      const existing = (await offlineDb.table(table).get(id)) as
        | { _pending?: boolean; _sync_failed?: boolean }
        | undefined;
      // Never remove or overwrite unsynced local work.
      if (existing?._pending || existing?._sync_failed) continue;
      if (row.deleted_at) {
        await offlineDb.table(table).delete(id);
      } else {
        await offlineDb.table(table).put({
          ...row,
          id,
          _pending: false,
          _sync_failed: false,
        });
      }
    }
  });
}

async function mergePullUserSettings(
  rows: Record<string, unknown>[] | undefined,
) {
  if (!rows?.length) return;
  for (const row of rows) {
    const id = String(row.id);
    const existing = await offlineDb.user_settings.get(id);
    if ((existing as any)?._pending) continue;
    await offlineDb.user_settings.put({
      ...row,
      id,
      _pending: false,
    } as any);
  }
}

async function mergePullAiPreferences(
  rows: Record<string, unknown>[] | undefined,
) {
  if (!rows?.length) return;
  for (const row of rows) {
    const id = String(row.user_id || row.id);
    const existing = await offlineDb.ai_preferences.get(id);
    if ((existing as any)?._pending) continue;
    await offlineDb.ai_preferences.put({ ...row, id, _pending: false } as any);
  }
}

async function mergePullNotificationPrefs(
  rows: Record<string, unknown>[] | undefined,
) {
  if (!rows?.length) return;
  for (const row of rows) {
    const id = String(row.user_id || row.id);
    const existing = await offlineDb.notification_preferences.get(id);
    if ((existing as any)?._pending) continue;
    await offlineDb.notification_preferences.put({
      ...row,
      id,
      _pending: false,
    } as any);
  }
}

async function applyServerRow(
  entityType: SyncEntityType,
  serverRow: Record<string, unknown>,
  clientEntityId?: string,
) {
  const tableName = ENTITY_TABLE[entityType as keyof typeof ENTITY_TABLE];
  if (!tableName) return;
  const id = String(
    clientEntityId ||
      serverRow.id ||
      serverRow.user_id ||
      serverRow.entity_id ||
      "",
  );
  if (!id) return;
  if (serverRow.deleted_at) {
    await offlineDb.table(tableName).delete(id);
    return;
  }
  const existing = (await offlineDb.table(tableName).get(id)) as
    | Record<string, unknown>
    | undefined;
  await offlineDb.table(tableName).put({
    // Keep local display joins if server row omits them.
    ...(existing || {}),
    ...serverRow,
    id,
    _pending: false,
    _sync_failed: false,
  });
}

async function clearLocalPending(entityType: SyncEntityType, entityId: string) {
  const tableName = ENTITY_TABLE[entityType as keyof typeof ENTITY_TABLE];
  if (!tableName) return;
  const existing = await offlineDb.table(tableName).get(entityId);
  if (!existing) return;
  await offlineDb.table(tableName).put({
    ...existing,
    _pending: false,
    _sync_failed: false,
  });
}

async function flagLocalFailed(
  entityType: SyncEntityType,
  entityId: string,
  failed: boolean,
) {
  const tableName = ENTITY_TABLE[entityType as keyof typeof ENTITY_TABLE];
  if (!tableName) return;
  const existing = await offlineDb.table(tableName).get(entityId);
  if (!existing) return;
  await offlineDb.table(tableName).put({
    ...existing,
    _pending: true,
    _sync_failed: failed,
  });
}

async function loadLocalRow(
  entityType: SyncEntityType,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  const tableName = ENTITY_TABLE[entityType as keyof typeof ENTITY_TABLE];
  if (!tableName) return null;
  const row = await offlineDb.table(tableName).get(entityId);
  return (row as Record<string, unknown>) || null;
}

export async function bootstrapOfflineSync(userId?: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  if (userId) {
    bindDurableBackupUser(userId);
    const result = await restoreDurableBackup(userId);
    if (result.restored > 0) {
      lastError = null;
      await emitStatus();
    }
  }
  if (bootstrapped) return;
  bootstrapped = true;
  const { initNetworkMonitor, subscribeNetwork } = await import("./network");
  await initNetworkMonitor();
  await recoverStuckSyncing();
  subscribeNetwork((online) => {
    void emitStatus();
    if (online) {
      // Sync when connectivity returns — not on a timer.
      setTimeout(() => void runSync("online"), 2_000);
    }
  });
  if (isOnline()) {
    setTimeout(() => void runSync("boot"), 1_500);
  }
  await emitStatus();
}
