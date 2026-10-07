import {
  offlineDb,
  type ConflictItem,
  type OutboxOp,
  type SyncEntityType,
} from "./db";
import { enqueueOutbox } from "./outbox";

export async function addConflict(input: {
  client_op_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  op?: OutboxOp;
  local_row: Record<string, unknown>;
  server_row: Record<string, unknown>;
}): Promise<ConflictItem> {
  const row: ConflictItem = {
    ...input,
    created_at: new Date().toISOString(),
  };
  const id = await offlineDb.conflicts.add(row);
  return { ...row, id };
}

export async function listConflicts(): Promise<ConflictItem[]> {
  return offlineDb.conflicts.orderBy("created_at").reverse().toArray();
}

export async function countConflicts(): Promise<number> {
  return offlineDb.conflicts.count();
}

export async function resolveKeepRemote(conflictId: number): Promise<void> {
  const conflict = await offlineDb.conflicts.get(conflictId);
  if (!conflict) return;

  const table = entityTable(conflict.entity_type);
  if (table) {
    if (conflict.server_row.deleted_at) {
      await offlineDb.table(table).delete(conflict.entity_id);
    } else {
      await offlineDb.table(table).put({
        ...conflict.server_row,
        id: conflict.entity_id,
        _pending: false,
        _sync_failed: false,
      });
    }
  }
  await offlineDb.conflicts.delete(conflictId);
}

export async function resolveKeepLocal(conflictId: number): Promise<void> {
  const conflict = await offlineDb.conflicts.get(conflictId);
  if (!conflict) return;

  // Replay the original op: a conflicted delete must stay a delete, not
  // become an update that resurrects the record.
  const op: OutboxOp = conflict.op || "update";
  await enqueueOutbox({
    entity_type: conflict.entity_type,
    entity_id: conflict.entity_id,
    op,
    payload: op === "delete" ? {} : conflict.local_row,
    base_sync_version: Number(conflict.server_row.sync_version || 0),
    force: true,
  });
  await offlineDb.conflicts.delete(conflictId);
}

function entityTable(type: SyncEntityType): string | null {
  const map: Partial<Record<SyncEntityType, string>> = {
    account: "accounts",
    transaction: "transactions",
    category: "categories",
    budget: "budgets",
    goal: "goals",
    investment: "investments",
    loan: "loans",
    recurring: "recurring",
  };
  return map[type] || null;
}
