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
import { scheduleSync } from "./sync-engine";
import { getActiveOfflineUserId } from "./clear-session";
import { pushOutboxItemViaRest } from "./rest-fallback";

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

    if (isOnline()) {
      try {
        await hydrateFromRemote();
      } catch {
        /* keep whatever is already on device */
      }
    }
    return readLocal();
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

  function restItem(
    id: string,
    op: OutboxOp,
    payload: Record<string, unknown>,
    now: string,
  ) {
    return {
      client_op_id: id,
      entity_type: config.entityType,
      entity_id: id,
      op,
      payload,
      status: "pending" as const,
      retry_count: 0,
      next_retry_at: null,
      last_error: null,
      created_at: now,
      updated_at: now,
    };
  }

  async function persistPending(
    row: T,
    op: OutboxOp,
    payload: Record<string, unknown>,
    baseSyncVersion: number,
  ) {
    await offlineDb.table(config.table).put(row as SyncedRecord);
    await enqueueOutbox({
      entity_type: config.entityType,
      entity_id: String(row.id),
      op,
      payload,
      base_sync_version: baseSyncVersion,
    });
    if (isOnline()) scheduleSync(op);
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

    // Online: remote first. Local + outbox only if the live call fails.
    // Offline: write Dexie and queue — sync when connectivity returns.
    if (isOnline()) {
      try {
        const serverRow = await pushOutboxItemViaRest(
          restItem(id, "create", { ...payload, id }, now),
        );
        const synced = config.normalize({
          ...(serverRow || local),
          id: String(serverRow?.id || id),
          user_id: (serverRow as SyncedRecord | null)?.user_id || ownerId,
          _pending: false,
          _sync_failed: false,
        });
        await offlineDb.table(config.table).put(synced as SyncedRecord);
        return synced;
      } catch {
        await persistPending(local, "create", { ...payload, id }, 1);
        return local;
      }
    }

    await persistPending(local, "create", { ...payload, id }, 1);
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

    if (isOnline()) {
      try {
        const serverRow = await pushOutboxItemViaRest(
          restItem(id, "update", payload, now),
        );
        const synced = config.normalize({
          ...next,
          ...(serverRow || {}),
          id,
          _pending: false,
          _sync_failed: false,
        });
        await offlineDb.table(config.table).put(synced as SyncedRecord);
        return synced;
      } catch {
        await persistPending(
          next,
          "update",
          payload,
          Number(existing?.sync_version || 1),
        );
        return next;
      }
    }

    await persistPending(
      next,
      "update",
      payload,
      Number(existing?.sync_version || 1),
    );
    return next;
  }

  async function remove(id: string): Promise<void> {
    const existing = (await offlineDb.table(config.table).get(id)) as
      | T
      | undefined;
    const now = new Date().toISOString();
    const tombstone = existing
      ? config.normalize({
          ...existing,
          deleted_at: now,
          updated_at: now,
          _pending: true,
          _sync_failed: false,
        })
      : null;

    if (isOnline()) {
      try {
        await pushOutboxItemViaRest(restItem(id, "delete", {}, now));
        await offlineDb.table(config.table).delete(id);
        return;
      } catch {
        if (tombstone) {
          await persistPending(
            tombstone,
            "delete",
            {},
            Number(existing?.sync_version || 1),
          );
        }
        return;
      }
    }

    if (tombstone) {
      await persistPending(
        tombstone,
        "delete",
        {},
        Number(existing?.sync_version || 1),
      );
    }
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
    if (isOnline()) scheduleSync(op);
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
