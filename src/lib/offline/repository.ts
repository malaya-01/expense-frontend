import {
  ENTITY_TABLE,
  newId,
  offlineDb,
  type EntityTableName,
  type SyncEntityType,
  type SyncedRecord,
} from "./db";
import { enqueueOutbox } from "./outbox";
import type { OutboxOp } from "./db";
import { isOnline } from "./network";
import { runSync } from "./sync-engine";
import { getActiveOfflineUserId } from "./clear-session";

export type SyncUiState = "synced" | "pending" | "offline" | "failed";

type RepoConfig<T extends SyncedRecord> = {
  entityType: SyncEntityType;
  table: EntityTableName;
  normalize: (row: any) => T;
  remoteList: () => Promise<T[]>;
  remoteCreate?: (payload: any) => Promise<T>;
  remoteUpdate?: (id: string, payload: any) => Promise<T>;
  remoteDelete?: (id: string) => Promise<void>;
  remoteGet?: (id: string) => Promise<T>;
};

function belongsToActiveUser(row: SyncedRecord): boolean {
  const uid = getActiveOfflineUserId();
  if (!uid) return false;
  const owner = row.user_id;
  if (owner == null || owner === "") return false;
  return String(owner) === uid;
}

function activeOnly<T extends SyncedRecord>(rows: T[]): T[] {
  return rows.filter((r) => !r.deleted_at && belongsToActiveUser(r));
}

/** Tag for list/detail UI — never drop local rows without this. */
export function getRecordSyncState(
  row: { _pending?: boolean; _sync_failed?: boolean } | null | undefined,
): SyncUiState {
  if (!row) return "synced";
  if (row._sync_failed) return "failed";
  if (row._pending) return isOnline() ? "pending" : "offline";
  return "synced";
}

export function createRepository<T extends SyncedRecord>(
  config: RepoConfig<T>,
) {
  /**
   * Merge remote into Dexie without wiping local-only / pending rows.
   * Local-first: never replace the table wholesale.
   */
  async function hydrateFromRemote(): Promise<void> {
    const remote = await config.remoteList();
    await offlineDb.transaction("rw", offlineDb.table(config.table), async () => {
      for (const row of remote) {
        const id = String((row as SyncedRecord).id);
        const existing = (await offlineDb.table(config.table).get(id)) as
          | SyncedRecord
          | undefined;
        if (existing?._pending || existing?._sync_failed) continue;
        const ownerId = getActiveOfflineUserId();
        await offlineDb.table(config.table).put({
          ...row,
          id,
          user_id: (row as SyncedRecord).user_id || ownerId,
          _pending: false,
          _sync_failed: false,
        } as SyncedRecord);
      }
    });
  }

  async function list(): Promise<T[]> {
    // Always paint from local DB first (source of truth on device).
    const readLocal = async () =>
      activeOnly(
        (await offlineDb.table(config.table).toArray()) as T[],
      ).map((row) =>
        config.normalize({
          ...row,
          _pending: Boolean((row as SyncedRecord)._pending),
          _sync_failed: Boolean((row as SyncedRecord)._sync_failed),
        }),
      );

    const local = await readLocal();

    if (isOnline()) {
      // Background merge only — never block UI on cold servers.
      void (async () => {
        try {
          await hydrateFromRemote();
          void runSync("list");
        } catch {
          /* keep local */
        }
      })();
    }

    return local;
  }

  async function get(id: string): Promise<T> {
    const local = (await offlineDb.table(config.table).get(id)) as
      | T
      | undefined;
    if (local && !local.deleted_at) {
      return config.normalize({
        ...local,
        _pending: Boolean((local as SyncedRecord)._pending),
        _sync_failed: Boolean((local as SyncedRecord)._sync_failed),
      });
    }

    if (isOnline() && config.remoteGet) {
      try {
        const remote = await config.remoteGet(id);
        await offlineDb.table(config.table).put({
          ...remote,
          _pending: false,
          _sync_failed: false,
        } as SyncedRecord);
        return config.normalize(remote);
      } catch {
        /* fall through */
      }
    }
    if (local) return config.normalize(local);
    throw new Error("Record not found");
  }

  async function create(payload: Record<string, unknown>): Promise<T> {
    const id = String(payload.id || newId());
    const now = new Date().toISOString();
    const ownerId = getActiveOfflineUserId();
    const local = config.normalize({
      ...payload,
      id,
      user_id: payload.user_id || ownerId,
      sync_version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      _pending: true,
      _sync_failed: false,
    });
    await offlineDb.table(config.table).put(local as SyncedRecord);
    await enqueueOutbox({
      entity_type: config.entityType,
      entity_id: id,
      op: "create",
      payload: { ...payload, id },
      base_sync_version: 1,
    });
    if (isOnline()) void runSync("create");
    return local;
  }

  async function update(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const existing = (await offlineDb.table(config.table).get(id)) as
      | T
      | undefined;
    const now = new Date().toISOString();
    const next = config.normalize({
      ...(existing || { id }),
      ...payload,
      id,
      updated_at: now,
      _pending: true,
      _sync_failed: false,
      sync_version: Number(existing?.sync_version || 1),
    });
    await offlineDb.table(config.table).put(next as SyncedRecord);
    await enqueueOutbox({
      entity_type: config.entityType,
      entity_id: id,
      op: "update",
      payload,
      base_sync_version: Number(existing?.sync_version || 1),
    });
    if (isOnline()) void runSync("update");
    return next;
  }

  async function remove(id: string): Promise<void> {
    const existing = (await offlineDb.table(config.table).get(id)) as
      | T
      | undefined;
    const now = new Date().toISOString();
    if (existing) {
      await offlineDb.table(config.table).put({
        ...existing,
        deleted_at: now,
        updated_at: now,
        _pending: true,
        _sync_failed: false,
      } as SyncedRecord);
    }
    await enqueueOutbox({
      entity_type: config.entityType,
      entity_id: id,
      op: "delete",
      payload: {},
      base_sync_version: Number(existing?.sync_version || 1),
    });
    if (isOnline()) void runSync("delete");
  }

  async function enqueueSpecial(
    op: OutboxOp,
    entityId: string,
    payload: Record<string, unknown>,
    entityType: SyncEntityType = config.entityType,
  ) {
    await enqueueOutbox({
      entity_type: entityType,
      entity_id: entityId,
      op,
      payload,
      base_sync_version: 1,
    });
    if (isOnline()) void runSync(op);
  }

  return {
    list,
    get,
    create,
    update,
    remove,
    enqueueSpecial,
    hydrateFromRemote,
  };
}

export { ENTITY_TABLE };
