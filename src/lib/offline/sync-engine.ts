import {
  api,
  getErrorMessage,
  isRetryableWriteError,
  unwrap,
} from "@/lib/api/client";
import {
  getOrCreateDeviceId,
  getMeta,
  newId,
  offlineDb,
  setMeta,
  tableForEntityType,
  type EntityTableName,
  type OutboxItem,
  type SyncEntityType,
} from "./db";
import { addConflict } from "./conflicts";
import { isOnline } from "./network";
import {
  listPendingOutbox,
  markOutboxFailed,
  markOutboxSynced,
  markOutboxSyncing,
  MAX_AUTO_RETRIES,
  newClientOpId,
  nextOutboxRetryAt,
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
import { invalidateHydrate } from "./hydrate-cache";
import axios from "axios";

/** Free-tier hosts (Render) often need a long wake-up window. */
const SYNC_TIMEOUT_MS = 90_000;
const PUSH_BATCH_SIZE = 8;
/** Re-pull a window before the cursor; merge is idempotent. */
const PULL_OVERLAP_MS = 5 * 60_000;
const MIN_RETRY_DELAY_MS = 1_000;

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
let queuedSync: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryDueAt = 0;
let lastSyncCompletedAt = 0;
let lastBootUserId: string | null = null;
const AUTO_SYNC_GAP_MS = 12_000;
/** Once we know /api/sync is missing on the server, skip it and use REST. */
let useRestFallback = false;
/**
 * Bumped on sign-out / account switch. A run started under an older epoch
 * must not write into the (cleared) local DB.
 */
let syncEpoch = 0;

class SyncAbortedError extends Error {
  constructor() {
    super("Sync cancelled — local session was reset");
  }
}

function assertEpoch(epoch: number) {
  if (epoch !== syncEpoch) throw new SyncAbortedError();
}

export function resetOfflineSyncRuntime() {
  syncEpoch += 1;
  syncing = false;
  lastError = null;
  queuedSync = null;
  lastBootUserId = null;
  lastSyncCompletedAt = 0;
  useRestFallback = false;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
    retryDueAt = 0;
  }
  // Drop in-flight list hydrates so they can't repopulate cleared tables.
  invalidateHydrate();
}

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
  "payment_method",
  "upi_vpa",
  "upi_txn_id",
  "payment_status",
  "paid_at",
  "platform",
  "platform_txn_id",
  "receipt_id",
] as const;

/** Payload fields that may hold another local entity's id. */
const FOREIGN_KEY_FIELDS = [
  "source_container_id",
  "destination_container_id",
  "category_id",
  "container_id",
  "parent_id",
] as const;

/** Entity types whose update payload legitimately carries `status`. */
const STATUS_WRITABLE_TYPES = new Set<string>(["loan", "recurring"]);

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
  // Strip UI-only flags and display / computed joins from any entity.
  const {
    _pending: _p,
    _sync_failed: _f,
    source_name: _sn,
    destination_name: _dn,
    category_name: _cn,
    category_color: _cc,
    container_name: _cnm,
    source_currency: _sc,
    destination_currency: _dc,
    spent: _spent,
    remaining: _rem,
    percent: _pct,
    progress_source: _ps,
    monthly_surplus: _ms,
    status,
    ...rest
  } = payload;
  if (STATUS_WRITABLE_TYPES.has(entityType) && status !== undefined) {
    return { ...rest, status, id: entityId };
  }
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

/** One timer for "run again later" (outbox backoff or throttle window). */
function scheduleRetry(delayMs: number) {
  if (typeof window === "undefined") return;
  const delay = Math.max(MIN_RETRY_DELAY_MS, delayMs);
  const dueAt = Date.now() + delay;
  if (retryTimer) {
    if (retryDueAt <= dueAt) return;
    clearTimeout(retryTimer);
  }
  retryDueAt = dueAt;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    retryDueAt = 0;
    void runSync("retry", { force: true });
  }, delay);
}

/** After a run: if auto-retryable ops remain, wake up when the first is due. */
async function scheduleFollowUp() {
  if (!isOnline()) return;
  const at = await nextOutboxRetryAt();
  if (at == null) return;
  scheduleRetry(at - Date.now());
}

/**
 * Coalesce background sync. Page loads must not call this.
 * Immediate: login/boot, network return, or the header Sync button.
 * Debounced: leftover outbox after a failed live write.
 */
export function scheduleSync(reason = "auto"): void {
  if (
    reason === "manual" ||
    reason === "boot" ||
    reason === "online" ||
    reason === "conflict-local"
  ) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    void runSync(reason);
    return;
  }
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runSync(reason);
  }, 2_000);
}

export async function runSync(
  reason = "manual",
  options?: { force?: boolean },
): Promise<void> {
  if (syncing) {
    // Never drop a request made mid-run; "manual" wins (it requeues failures).
    if (!queuedSync || reason === "manual") queuedSync = reason;
    return;
  }
  if (!isOnline()) {
    await emitStatus();
    return;
  }
  if (
    !options?.force &&
    reason !== "manual" &&
    reason !== "conflict-local" &&
    lastSyncCompletedAt &&
    Date.now() - lastSyncCompletedAt < AUTO_SYNC_GAP_MS
  ) {
    // Throttled, not dropped: run once the gap has elapsed.
    scheduleRetry(lastSyncCompletedAt + AUTO_SYNC_GAP_MS - Date.now());
    return;
  }

  const epoch = syncEpoch;
  syncing = true;
  lastError = null;
  await emitStatus();

  try {
    await recoverStuckSyncing();
    if (reason === "manual") {
      await requeueAllFailed();
    }
    assertEpoch(epoch);
    await pushOutbox(epoch);
    assertEpoch(epoch);
    // 404 → REST fallback is handled inside pullChanges. Any other error
    // (400/422/5xx/network) fails this run without touching the cursor.
    await pullChanges(epoch);
    assertEpoch(epoch);
    const { purgeSyncedOutbox } = await import("./outbox");
    await purgeSyncedOutbox();
    await setMeta("last_sync_at", new Date().toISOString());
    lastError = null;
    invalidateHydrate();
    await persistDurableBackup();
    lastSyncCompletedAt = Date.now();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("finos:sync-complete"));
    }
  } catch (error: any) {
    if (!(error instanceof SyncAbortedError) && epoch === syncEpoch) {
      lastError = getErrorMessage(error, `Sync failed (${reason})`);
      // Never delete local data on sync failure — only requeue outbox.
      await recoverStuckSyncing();
      await persistDurableBackup();
    }
  } finally {
    // A reset (sign-out) during the run owns the runtime state now.
    if (epoch === syncEpoch) {
      syncing = false;
      await emitStatus();
      const next = queuedSync;
      queuedSync = null;
      if (next) {
        void runSync(next, { force: true });
      } else {
        await scheduleFollowUp().catch(() => undefined);
      }
    }
  }
}

/** Ops on a child entity (contribution/payment/execute) key on the parent. */
function entityKey(item: Pick<OutboxItem, "entity_type" | "entity_id">) {
  return `${tableForEntityType(item.entity_type) ?? item.entity_type}:${item.entity_id}`;
}

async function pushOutbox(epoch: number) {
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

  // Server sync_version per entity learned during this run, so later ops
  // on the same entity don't send a stale base and self-conflict.
  const rebased = new Map<string, number>();

  // Push in small batches so a cold-start timeout doesn't strand everything.
  for (let i = 0; i < pending.length; i += PUSH_BATCH_SIZE) {
    assertEpoch(epoch);
    const batch = pending.slice(i, i + PUSH_BATCH_SIZE);
    await pushBatch(batch, epoch, rebased);
  }
}

/** Server row to store on the parent entity for this op (if any). */
function parentServerRow(
  item: OutboxItem,
  serverRow: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!serverRow) return null;
  switch (item.entity_type) {
    case "goal_contribute":
      // Contribution returns the updated goal.
      return String(serverRow.id || "") === item.entity_id ? serverRow : null;
    case "loan_payment": {
      const loan = serverRow.loan;
      return loan && typeof loan === "object"
        ? (loan as Record<string, unknown>)
        : null;
    }
    case "recurring_execute":
      return null;
    default:
      return serverRow;
  }
}

function isServerRejection(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    Boolean(error.response) &&
    !isRetryableWriteError(error) &&
    error.response?.status !== 401
  );
}

async function pushBatch(
  pending: OutboxItem[],
  epoch: number,
  rebased: Map<string, number>,
) {
  if (!pending.length) return;
  const ids = pending.map((p) => p.id!).filter(Boolean);
  await markOutboxSyncing(ids);

  if (useRestFallback) {
    await pushBatchViaRest(pending, epoch);
    return;
  }

  try {
    const deviceId = await getOrCreateDeviceId();
    const opIds = pending.map((item) =>
      String(item.client_op_id || item.id || newId()),
    );
    const seen = new Set<string>();
    const changes = pending.map((item, index) => {
      const updatedAt = String(item.updated_at || "");
      const validDate = !Number.isNaN(Date.parse(updatedAt));
      const key = entityKey(item);
      // Only the first op per entity in a batch carries a base version; the
      // later ones build on it and would otherwise conflict with themselves.
      let base: number | undefined;
      if (!seen.has(key)) {
        seen.add(key);
        const fromRun = rebased.get(key);
        const own = Number(item.base_sync_version);
        base = fromRun ?? (Number.isFinite(own) ? own : undefined);
      }
      return {
        client_op_id: opIds[index],
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        op: item.op,
        payload: sanitizeOutboxPayload(
          item.entity_type,
          item.payload,
          item.entity_id,
        ),
        ...(validDate ? { client_updated_at: updatedAt } : {}),
        ...(base !== undefined ? { base_sync_version: base } : {}),
        force: Boolean(item.force),
      };
    });
    const res = await withTimeout(
      api.post(
        "/sync/push",
        { device_id: deviceId, changes },
        { timeout: SYNC_TIMEOUT_MS },
      ),
      SYNC_TIMEOUT_MS + 5_000,
      "Sync push",
    );
    assertEpoch(epoch);
    const data = unwrap<{ results: PushResult[] }>(res);
    const byOp = new Map(data.results.map((r) => [r.client_op_id, r]));

    for (const [index, item] of pending.entries()) {
      assertEpoch(epoch);
      const result = byOp.get(opIds[index]);
      if (item.id == null) continue;

      if (!result) {
        await markOutboxFailed(
          item.id,
          "No result from server — will retry",
          item.retry_count + 1,
        );
        await flagLocalFailed(item, true);
        continue;
      }

      if (result.status === "applied" || result.status === "duplicate") {
        const row = parentServerRow(item, result.server_row);
        await settleLocal(item, row);
        const version = Number(row?.sync_version);
        if (result.status === "applied" && Number.isFinite(version)) {
          rebased.set(entityKey(item), version);
          await rebaseQueuedOps(item, version);
        }
        await markOutboxSynced(item.id);
        continue;
      }

      if (result.status === "conflict" && result.server_row) {
        const local = await loadLocalRow(item);
        await addConflict({
          client_op_id: item.client_op_id,
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          op: item.op,
          local_row: local || item.payload,
          server_row: result.server_row,
        });
        await markOutboxSynced(item.id);
        continue;
      }

      // Server-side error. A fresh client_op_id makes sure the retry is
      // re-applied instead of being answered from the server's op log.
      const retryCount = item.retry_count + 1;
      await markOutboxFailed(item.id, result.error || "Push failed", retryCount, {
        newClientOpId: newClientOpId(),
        terminal: retryCount >= MAX_AUTO_RETRIES,
      });
      await flagLocalFailed(item, true);
    }
  } catch (error: any) {
    if (error instanceof SyncAbortedError || epoch !== syncEpoch) throw error;
    // Only a missing sync API (404) switches to REST. A 400/422 means the
    // batch was rejected and must not be silently re-sent via REST.
    if (isSyncApiMissing(error)) {
      useRestFallback = true;
      await pushBatchViaRest(pending, epoch);
      return;
    }
    const rejected = isServerRejection(error);
    for (const item of pending) {
      if (item.id == null) continue;
      const retryCount = item.retry_count + 1;
      await markOutboxFailed(
        item.id,
        getErrorMessage(error, "Network error during sync"),
        retryCount,
        rejected ? { terminal: retryCount >= MAX_AUTO_RETRIES } : undefined,
      );
      await flagLocalFailed(item, true);
    }
    throw error;
  }
}

async function pushBatchViaRest(pending: OutboxItem[], epoch: number) {
  for (const item of pending) {
    if (item.id == null) continue;
    assertEpoch(epoch);
    try {
      const serverRow = await pushOutboxItemViaRest(item);
      assertEpoch(epoch);
      const serverId = serverRow ? String(serverRow.id || item.entity_id) : "";
      if (serverRow && item.op === "create" && serverId !== item.entity_id) {
        await migrateLocalId(item, serverRow);
      } else {
        await settleLocal(item, parentServerRow(item, serverRow));
      }
      await markOutboxSynced(item.id);
    } catch (error: any) {
      if (error instanceof SyncAbortedError || epoch !== syncEpoch) throw error;
      const retryCount = item.retry_count + 1;
      await markOutboxFailed(
        item.id,
        getErrorMessage(error, "REST sync failed"),
        retryCount,
        isServerRejection(error)
          ? { terminal: retryCount >= MAX_AUTO_RETRIES }
          : undefined,
      );
      await flagLocalFailed(item, true);
    }
  }
}

function rewriteForeignKeys(
  row: Record<string, unknown>,
  oldId: string,
  nextId: string,
): boolean {
  let changed = false;
  for (const key of FOREIGN_KEY_FIELDS) {
    if (row[key] === oldId) {
      row[key] = nextId;
      changed = true;
    }
  }
  return changed;
}

const FK_TABLES: EntityTableName[] = [
  "transactions",
  "budgets",
  "goals",
  "investments",
  "loans",
  "recurring",
  "categories",
  "accounts",
];

async function migrateLocalId(item: OutboxItem, serverRow: Record<string, unknown>) {
  const tableName = tableForEntityType(item.entity_type);
  if (!tableName) return;
  const oldId = item.entity_id;
  const nextId = String(serverRow.id);

  // Queued ops for this entity, or referencing it, must follow the new id.
  await offlineDb.outbox
    .filter((row) => row.id !== item.id && row.status !== "synced")
    .modify((row) => {
      if (row.entity_id === oldId) row.entity_id = nextId;
      if (row.payload && typeof row.payload === "object") {
        if (row.payload.id === oldId) row.payload.id = nextId;
        rewriteForeignKeys(row.payload, oldId, nextId);
      }
    });
  for (const table of FK_TABLES) {
    await offlineDb
      .table(table)
      .filter((row: Record<string, unknown>) =>
        FOREIGN_KEY_FIELDS.some((key) => row[key] === oldId),
      )
      .modify((row: Record<string, unknown>) => {
        rewriteForeignKeys(row, oldId, nextId);
      });
  }

  const existing = (await offlineDb.table(tableName).get(oldId)) as
    | Record<string, unknown>
    | undefined;
  const stillQueued = await hasOtherQueuedOps({ ...item, entity_id: nextId });
  await offlineDb.table(tableName).delete(oldId);
  await offlineDb.table(tableName).put({
    ...(existing || {}),
    ...serverRow,
    id: nextId,
    _pending: stillQueued,
    _sync_failed: false,
  });
}

/** Other unsynced ops still target the same (parent) entity. */
async function hasOtherQueuedOps(item: OutboxItem): Promise<boolean> {
  const key = entityKey(item);
  const count = await offlineDb.outbox
    .where("status")
    .anyOf(["pending", "failed", "syncing"])
    .filter(
      (row) =>
        row.id !== item.id &&
        row.entity_id === item.entity_id &&
        entityKey(row) === key,
    )
    .count();
  return count > 0;
}

/** Point queued ops for this entity at the server's latest sync_version. */
async function rebaseQueuedOps(item: OutboxItem, version: number) {
  const key = entityKey(item);
  await offlineDb.outbox
    .where("status")
    .anyOf(["pending", "failed"])
    .filter(
      (row) =>
        row.id !== item.id &&
        row.entity_id === item.entity_id &&
        entityKey(row) === key &&
        row.base_sync_version != null,
    )
    .modify({ base_sync_version: version });
}

/** Success: store the server row (or just clear flags) on the local row. */
async function settleLocal(
  item: OutboxItem,
  serverRow: Record<string, unknown> | null,
) {
  const tableName = tableForEntityType(item.entity_type);
  if (!tableName) return;
  const id = item.entity_id;
  if (!id) return;
  const table = offlineDb.table(tableName);

  if (item.op === "delete" || serverRow?.deleted_at) {
    await table.delete(id);
    return;
  }

  const stillQueued = await hasOtherQueuedOps(item);
  const existing = (await table.get(id)) as Record<string, unknown> | undefined;

  if (stillQueued) {
    // Later local edits are still pending — keep them on screen and only
    // take the server's version number.
    if (existing && serverRow?.sync_version != null) {
      await table.put({ ...existing, sync_version: serverRow.sync_version });
    }
    return;
  }

  if (serverRow) {
    await table.put({
      // Keep local display joins if server row omits them.
      ...(existing || {}),
      ...serverRow,
      id,
      _pending: false,
      _sync_failed: false,
    });
    return;
  }

  if (!existing) return;
  await table.put({ ...existing, _pending: false, _sync_failed: false });
}

async function pullChanges(epoch: number) {
  const isCurrent = () => epoch === syncEpoch;
  if (useRestFallback) {
    await hydrateViaRestLists({ isCurrent });
    return;
  }

  try {
    const deviceId = await getOrCreateDeviceId();
    const rawSince = (await getMeta("pull_cursor")) || undefined;
    const parsedSince = rawSince ? Date.parse(rawSince) : Number.NaN;
    const since = Number.isFinite(parsedSince)
      ? new Date(Math.max(0, parsedSince - PULL_OVERLAP_MS)).toISOString()
      : undefined;
    const res = await withTimeout(
      api.get("/sync/pull", {
        params: { since, device_id: deviceId },
        timeout: SYNC_TIMEOUT_MS,
      }),
      SYNC_TIMEOUT_MS + 5_000,
      "Sync pull",
    );
    assertEpoch(epoch);
    const data = unwrap<PullPayload>(res);
    const changes = data.changes || {};

    const tables: Array<[EntityTableName, string]> = [
      ["accounts", "accounts"],
      ["transactions", "transactions"],
      ["categories", "categories"],
      ["budgets", "budgets"],
      ["goals", "goals"],
      ["investments", "investments"],
      ["loans", "loans"],
      ["recurring", "recurring"],
    ];
    for (const [table, key] of tables) {
      assertEpoch(epoch);
      await mergePull(table, changes[key]);
    }
    assertEpoch(epoch);
    await mergePullUserSettings(changes.user_settings);
    await mergePullAiPreferences(changes.ai_preferences);
    await mergePull("ai_memories", changes.ai_memories);
    await mergePullNotificationPrefs(changes.notification_preferences);

    assertEpoch(epoch);
    if (data.cursor) await setMeta("pull_cursor", data.cursor);
  } catch (error: any) {
    if (error instanceof SyncAbortedError) throw error;
    if (isSyncApiMissing(error)) {
      useRestFallback = true;
      await hydrateViaRestLists({ isCurrent });
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
  const { getActiveOfflineUserId } = await import("./clear-session");
  const ownerId = getActiveOfflineUserId();
  await offlineDb.transaction("rw", offlineDb.table(table), async () => {
    for (const row of rows) {
      const id = String(row.id);
      const existing = (await offlineDb.table(table).get(id)) as
        | {
            _pending?: boolean;
            _sync_failed?: boolean;
            user_id?: string;
            deleted_at?: string | null;
            updated_at?: string;
          }
        | undefined;
      // Never remove or overwrite unsynced local work. Otherwise the server
      // wins — a newer local updated_at on a synced row is just clock skew.
      if (existing?._pending || existing?._sync_failed) continue;
      if (existing?.deleted_at && !row.deleted_at) continue;
      if (row.deleted_at) {
        await offlineDb.table(table).delete(id);
      } else {
        await offlineDb.table(table).put({
          ...row,
          id,
          user_id: row.user_id || existing?.user_id || ownerId,
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

async function flagLocalFailed(item: OutboxItem, failed: boolean) {
  const tableName = tableForEntityType(item.entity_type);
  if (!tableName) return;
  const existing = await offlineDb.table(tableName).get(item.entity_id);
  if (!existing) return;
  await offlineDb.table(tableName).put({
    ...existing,
    _pending: true,
    _sync_failed: failed,
  });
}

async function loadLocalRow(
  item: OutboxItem,
): Promise<Record<string, unknown> | null> {
  const tableName = tableForEntityType(item.entity_type);
  if (!tableName) return null;
  const row = await offlineDb.table(tableName).get(item.entity_id);
  return (row as Record<string, unknown>) || null;
}

export async function bootstrapOfflineSync(userId?: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  if (userId) {
    const { switchOfflineUser } = await import("./clear-session");
    await switchOfflineUser(userId);
    bindDurableBackupUser(userId);
    // Online: server is source of truth. Restore leftover outbox only after hydrate
    // so a reinstall / Preferences backup cannot paint stale balances first.
    if (isOnline()) {
      const hasLocal =
        (await offlineDb.accounts.count()) +
          (await offlineDb.transactions.count()) >
        0;
      const hydrate = hydrateViaRestLists().catch(() => undefined);
      // Only block first paint when the device has nothing to show yet.
      if (!hasLocal) await hydrate;
      else void hydrate;
      await restoreDurableBackup(userId, { restoreEntities: false });
    } else {
      const result = await restoreDurableBackup(userId);
      if (result.restored > 0) {
        lastError = null;
      }
    }
    await emitStatus();
  }
  if (!bootstrapped) {
    bootstrapped = true;
    const { initNetworkMonitor, subscribeNetwork } = await import("./network");
    await initNetworkMonitor();
    await recoverStuckSyncing();
    let wasOnline = isOnline();
    subscribeNetwork((online) => {
      void emitStatus();
      if (online && !wasOnline) {
        scheduleSync("online");
      }
      wasOnline = online;
    });
  }
  if (userId && userId !== lastBootUserId) {
    lastBootUserId = userId;
    if (isOnline()) scheduleSync("boot");
  }
  await emitStatus();
}
