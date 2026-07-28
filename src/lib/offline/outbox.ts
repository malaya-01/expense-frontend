import {
  offlineDb,
  type OutboxItem,
  type OutboxOp,
  type SyncEntityType,
} from "./db";

/** Longer backoff for free-tier cold starts (Render can take 30–60s). */
const RETRY_MS = [5_000, 15_000, 45_000, 120_000, 300_000];

export function newClientOpId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueOutbox(input: {
  entity_type: SyncEntityType;
  entity_id: string;
  op: OutboxOp;
  payload?: Record<string, unknown>;
  base_sync_version?: number;
  force?: boolean;
}): Promise<OutboxItem> {
  const now = new Date().toISOString();
  const row: OutboxItem = {
    client_op_id: newClientOpId(),
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    op: input.op,
    payload: input.payload || {},
    base_sync_version: input.base_sync_version,
    force: input.force,
    status: "pending",
    retry_count: 0,
    next_retry_at: null,
    last_error: null,
    created_at: now,
    updated_at: now,
  };
  const id = await offlineDb.outbox.add(row);
  return { ...row, id };
}

export async function listPendingOutbox(limit = 25): Promise<OutboxItem[]> {
  const now = Date.now();
  const rows = await offlineDb.outbox
    .where("status")
    .anyOf(["pending", "failed"])
    .sortBy("created_at");
  return rows
    .filter((row) => {
      if (!row.next_retry_at) return true;
      return new Date(row.next_retry_at).getTime() <= now;
    })
    .slice(0, limit);
}

export async function countPendingOutbox(): Promise<number> {
  return offlineDb.outbox
    .where("status")
    .anyOf(["pending", "failed", "syncing"])
    .count();
}

/** Recover items left in "syncing" after a crash/timeout — never drop them. */
export async function recoverStuckSyncing(): Promise<number> {
  const stuck = await offlineDb.outbox.where("status").equals("syncing").toArray();
  const now = new Date().toISOString();
  for (const row of stuck) {
    if (row.id == null) continue;
    await offlineDb.outbox.update(row.id, {
      status: "failed",
      last_error: row.last_error || "Interrupted while syncing — will retry",
      next_retry_at: new Date(Date.now() + 5_000).toISOString(),
      updated_at: now,
      retry_count: (row.retry_count || 0) + 1,
    });
  }
  return stuck.length;
}

export async function markOutboxSyncing(ids: number[]): Promise<void> {
  const now = new Date().toISOString();
  await offlineDb.transaction("rw", offlineDb.outbox, async () => {
    for (const id of ids) {
      await offlineDb.outbox.update(id, {
        status: "syncing",
        updated_at: now,
      });
    }
  });
}

export async function markOutboxSynced(id: number): Promise<void> {
  await offlineDb.outbox.update(id, {
    status: "synced",
    last_error: null,
    next_retry_at: null,
    updated_at: new Date().toISOString(),
  });
}

export async function markOutboxFailed(
  id: number,
  error: string,
  retryCount: number,
): Promise<void> {
  const delay = RETRY_MS[Math.min(retryCount, RETRY_MS.length - 1)];
  await offlineDb.outbox.update(id, {
    status: "failed",
    retry_count: retryCount,
    last_error: error,
    next_retry_at: new Date(Date.now() + delay).toISOString(),
    updated_at: new Date().toISOString(),
  });
}

/** Re-queue all failed/pending immediately (manual Sync now). */
export async function requeueAllFailed(): Promise<void> {
  const rows = await offlineDb.outbox
    .where("status")
    .anyOf(["failed", "syncing"])
    .toArray();
  const now = new Date().toISOString();
  for (const row of rows) {
    if (row.id == null) continue;
    await offlineDb.outbox.update(row.id, {
      status: "pending",
      next_retry_at: null,
      updated_at: now,
    });
  }
}

export async function requeueForce(
  item: OutboxItem,
  localRow: Record<string, unknown>,
): Promise<void> {
  await enqueueOutbox({
    entity_type: item.entity_type,
    entity_id: item.entity_id,
    op: item.op,
    payload: localRow,
    base_sync_version: Number(localRow.sync_version || 0),
    force: true,
  });
}
