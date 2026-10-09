import { offlineDb, tableForEntityType, type ConflictItem, type OutboxItem } from "./db";
import { invalidateHydrate, notifyDataUpdated } from "./hydrate-cache";
import { emitStatus, runSync } from "./sync-engine";

/**
 * Sync problems the user has to look at: changes the server refused
 * ("failed") and changes made on two devices ("conflicts"). Everything else
 * in the outbox is just waiting for a connection.
 */
export type SyncIssues = {
  failed: OutboxItem[];
  waiting: number;
  conflicts: ConflictItem[];
};

export async function listSyncIssues(): Promise<SyncIssues> {
  const [failed, waiting, conflicts] = await Promise.all([
    offlineDb.outbox.where("status").equals("failed").toArray(),
    offlineDb.outbox.where("status").anyOf(["pending", "syncing"]).count(),
    offlineDb.conflicts.orderBy("created_at").reverse().toArray(),
  ]);
  failed.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return { failed, waiting, conflicts };
}

/** Balances and lists come back from the server on the next read. */
async function refreshFromServer(table: string | null) {
  if (table) invalidateHydrate(table);
  invalidateHydrate("accounts");
  invalidateHydrate("transactions");
  await emitStatus();
  notifyDataUpdated();
}

/** Send one refused change again now. */
export async function retryFailedChange(item: OutboxItem): Promise<void> {
  if (item.id == null) return;
  await offlineDb.outbox.update(item.id, {
    status: "pending",
    next_retry_at: null,
    terminal: false,
    updated_at: new Date().toISOString(),
  });
  await emitStatus();
  await runSync("manual");
}

/**
 * Drop a refused change and go back to what the server has. A refused new
 * item is removed from this device; a refused edit or delete is undone (the
 * server copy is reloaded). Balances are reloaded from the server, so an
 * entry that never reached it can't leave money counted on this device.
 */
export async function discardFailedChange(item: OutboxItem): Promise<void> {
  const table = tableForEntityType(item.entity_type);
  if (table) {
    const row = (await offlineDb.table(table).get(item.entity_id)) as
      | Record<string, unknown>
      | undefined;
    if (row) {
      if (item.op === "create") {
        await offlineDb.table(table).delete(item.entity_id);
      } else {
        await offlineDb.table(table).put({
          ...row,
          deleted_at: null,
          _pending: false,
          _sync_failed: false,
        });
      }
    }
  }
  // Later queued ops on the same item depend on the refused one.
  const related = await offlineDb.outbox
    .where("status")
    .anyOf(["pending", "failed", "syncing"])
    .filter(
      (o) => o.entity_type === item.entity_type && o.entity_id === item.entity_id,
    )
    .toArray();
  await offlineDb.outbox.bulkDelete(
    related.map((o) => o.id).filter((id): id is number => id != null),
  );
  await refreshFromServer(table);
}

/** Server words → what the user can do about it. */
export function explainSyncError(message: string | null | undefined): string {
  const text = String(message || "");
  if (/balance negative|below zero/i.test(text)) {
    return "The account didn't have enough money for this when it reached the server.";
  }
  if (/exceeds the outstanding liability/i.test(text)) {
    return "This payment is more than what was still owed on that account.";
  }
  if (/container not found|unavailable/i.test(text)) {
    return "One of the accounts used here was deleted or archived.";
  }
  if (/category/i.test(text) && /not found/i.test(text)) {
    return "The category used here no longer exists.";
  }
  if (/not found/i.test(text)) {
    return "This item no longer exists on the server (it was deleted elsewhere).";
  }
  return text || "The server refused this change.";
}
