import Dexie, { type EntityTable } from "dexie";

export type OutboxStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "cancelled";

export type SyncEntityType =
  | "account"
  | "transaction"
  | "category"
  | "budget"
  | "goal"
  | "investment"
  | "loan"
  | "recurring"
  | "user_settings"
  | "ai_preferences"
  | "ai_memory"
  | "notification_preferences"
  | "goal_contribute"
  | "loan_payment"
  | "recurring_execute";

export type OutboxOp =
  | "create"
  | "update"
  | "delete"
  | "contribute"
  | "payment"
  | "execute";

export type OutboxItem = {
  id?: number;
  client_op_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  op: OutboxOp;
  payload: Record<string, unknown>;
  base_sync_version?: number;
  force?: boolean;
  status: OutboxStatus;
  retry_count: number;
  next_retry_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type ConflictItem = {
  id?: number;
  client_op_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  local_row: Record<string, unknown>;
  server_row: Record<string, unknown>;
  created_at: string;
};

export type MetaRow = {
  key: string;
  value: string;
};

export type SyncedRecord = Record<string, unknown> & {
  id: string;
  sync_version?: number;
  updated_at?: string;
  deleted_at?: string | null;
  _pending?: boolean;
  _sync_failed?: boolean;
};

class FinosOfflineDb extends Dexie {
  accounts!: EntityTable<SyncedRecord, "id">;
  transactions!: EntityTable<SyncedRecord, "id">;
  categories!: EntityTable<SyncedRecord, "id">;
  budgets!: EntityTable<SyncedRecord, "id">;
  goals!: EntityTable<SyncedRecord, "id">;
  investments!: EntityTable<SyncedRecord, "id">;
  loans!: EntityTable<SyncedRecord, "id">;
  recurring!: EntityTable<SyncedRecord, "id">;
  user_settings!: EntityTable<SyncedRecord, "id">;
  ai_preferences!: EntityTable<SyncedRecord, "id">;
  ai_memories!: EntityTable<SyncedRecord, "id">;
  notification_preferences!: EntityTable<SyncedRecord, "id">;
  outbox!: EntityTable<OutboxItem, "id">;
  conflicts!: EntityTable<ConflictItem, "id">;
  meta!: EntityTable<MetaRow, "key">;

  constructor() {
    super("finos-offline");
    this.version(1).stores({
      accounts: "id, updated_at, deleted_at",
      transactions: "id, updated_at, deleted_at, date",
      categories: "id, updated_at, deleted_at, name",
      budgets: "id, updated_at, deleted_at",
      goals: "id, updated_at, deleted_at",
      investments: "id, updated_at, deleted_at",
      loans: "id, updated_at, deleted_at",
      recurring: "id, updated_at, deleted_at",
      user_settings: "id, updated_at",
      ai_preferences: "id, updated_at",
      ai_memories: "id, updated_at, deleted_at",
      notification_preferences: "id, updated_at",
      outbox: "++id, client_op_id, status, entity_type, next_retry_at, created_at",
      conflicts: "++id, entity_type, entity_id, created_at",
      meta: "key",
    });
  }
}

export const offlineDb = new FinosOfflineDb();

export type EntityTableName =
  | "accounts"
  | "transactions"
  | "categories"
  | "budgets"
  | "goals"
  | "investments"
  | "loans"
  | "recurring"
  | "user_settings"
  | "ai_preferences"
  | "ai_memories"
  | "notification_preferences";

export const ENTITY_TABLE: Record<
  Exclude<
    SyncEntityType,
    "goal_contribute" | "loan_payment" | "recurring_execute"
  >,
  EntityTableName
> = {
  account: "accounts",
  transaction: "transactions",
  category: "categories",
  budget: "budgets",
  goal: "goals",
  investment: "investments",
  loan: "loans",
  recurring: "recurring",
  user_settings: "user_settings",
  ai_preferences: "ai_preferences",
  ai_memory: "ai_memories",
  notification_preferences: "notification_preferences",
};

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getMeta(key: string): Promise<string | null> {
  const row = await offlineDb.meta.get(key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await offlineDb.meta.put({ key, value });
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getMeta("device_id");
  if (existing) return existing;
  const id = newId();
  await setMeta("device_id", id);
  return id;
}
