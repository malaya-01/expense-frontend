/**
 * Local IndexedDB outbox for Collaborative Spaces drafts.
 * Conflict policy (v1): last-write-wins on the server; activity audit retains history.
 * This is not a multi-device CRDT — see doc/04_Modules/Collaborative_Spaces.md.
 */

import {
  ackSpaceSync,
  createSpaceExpense,
  createSpaceSettlement,
  enqueueSpaceSync,
  listSpaceSyncOutbox,
} from "@/lib/api/spaces";

const DB_NAME = "finos-spaces-outbox";
const STORE = "drafts";
const DB_VERSION = 1;
/** A row left in "syncing" longer than this was abandoned (crash / killed tab). */
const STALE_SYNCING_MS = 5 * 60_000;

export type SpaceDraft = {
  id?: number;
  client_op_id: string;
  entity_type: "space_expense" | "space_settlement" | string;
  space_id: string;
  payload: Record<string, unknown>;
  created_at: string;
  status: "pending" | "syncing" | "synced" | "failed";
  last_error?: string | null;
  syncing_at?: string | null;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Failed to open outbox DB"));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest | void,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        let tx: IDBTransaction;
        try {
          tx = db.transaction(STORE, mode);
        } catch (error) {
          db.close();
          reject(error);
          return;
        }
        const store = tx.objectStore(STORE);
        const result = fn(store);
        let value: T = undefined as T;
        if (result) {
          result.onsuccess = () => {
            value = result.result as T;
          };
        }
        // Resolve on commit and always close the connection so
        // clearSpaceDrafts / version changes are never blocked.
        tx.oncomplete = () => {
          db.close();
          resolve(value);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error || result?.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error || new Error("Outbox transaction aborted"));
        };
      }),
  );
}

export async function enqueueSpaceDraft(
  draft: Omit<SpaceDraft, "id" | "created_at" | "status">,
): Promise<SpaceDraft> {
  const row: SpaceDraft = {
    ...draft,
    created_at: new Date().toISOString(),
    status: "pending",
  };
  const id = await withStore<number>("readwrite", (store) => store.add(row));
  try {
    await enqueueSpaceSync({
      client_op_id: row.client_op_id,
      entity_type: row.entity_type,
      space_id: row.space_id,
      payload: row.payload,
    });
  } catch {
    /* server outbox is best-effort while offline */
  }
  return { ...row, id };
}

export async function listSpaceDrafts(): Promise<SpaceDraft[]> {
  try {
    const rows = await withStore<SpaceDraft[]>("readonly", (store) => store.getAll());
    return (rows || []).filter((r) => r.status !== "synced");
  } catch {
    return [];
  }
}

/** Wipe all local drafts (explicit sign-out / account switch). */
export async function clearSpaceDrafts(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await withStore("readwrite", (store) => store.clear());
}

function isFreshSyncing(draft: SpaceDraft, now = Date.now()): boolean {
  if (draft.status !== "syncing") return false;
  const at = Date.parse(String(draft.syncing_at || ""));
  // Legacy rows without a timestamp are treated as stale.
  return Number.isFinite(at) && now - at < STALE_SYNCING_MS;
}

async function applyDraft(draft: SpaceDraft) {
  if (draft.entity_type === "space_expense") {
    await createSpaceExpense(draft.space_id, draft.payload);
    return;
  }
  if (draft.entity_type === "space_settlement") {
    await createSpaceSettlement(draft.space_id, draft.payload);
    return;
  }
  throw new Error(`Unsupported entity_type: ${draft.entity_type}`);
}

async function runFlush(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }
  const now = Date.now();
  // Skip rows another tab is actively syncing; stale "syncing" rows (older
  // than STALE_SYNCING_MS) are retried like pending ones.
  const drafts = (await listSpaceDrafts()).filter((d) => !isFreshSyncing(d, now));
  let synced = 0;
  let failed = 0;
  const syncedClientOps: string[] = [];

  for (const draft of drafts) {
    if (draft.id == null) continue;
    const draftId = draft.id;
    try {
      await withStore("readwrite", (store) =>
        store.put({
          ...draft,
          status: "syncing",
          last_error: null,
          syncing_at: new Date().toISOString(),
        }),
      );
      await applyDraft(draft);
      // Done — drop the row instead of keeping "synced" rows forever.
      await withStore("readwrite", (store) => store.delete(draftId));
      synced += 1;
      syncedClientOps.push(draft.client_op_id);
    } catch (err: any) {
      failed += 1;
      try {
        await withStore("readwrite", (store) =>
          store.put({
            ...draft,
            status: "failed",
            syncing_at: null,
            last_error: err?.message || "Sync failed",
          }),
        );
      } catch {
        /* DB cleared (sign-out) while flushing */
      }
    }
  }

  if (syncedClientOps.length) {
    try {
      const serverRows = (await listSpaceSyncOutbox()) as Array<{
        id: string;
        client_op_id: string;
      }>;
      const ackIds = serverRows
        .filter((row) => syncedClientOps.includes(row.client_op_id))
        .map((row) => row.id);
      if (ackIds.length) await ackSpaceSync(ackIds);
    } catch {
      /* ignore ack failures */
    }
  }

  return { synced, failed };
}

let flushInFlight: Promise<{ synced: number; failed: number }> | null = null;

/** Single flight: concurrent callers share one pass over the drafts. */
export function flushSpaceOutbox(): Promise<{ synced: number; failed: number }> {
  if (!flushInFlight) {
    flushInFlight = runFlush().finally(() => {
      flushInFlight = null;
    });
  }
  return flushInFlight;
}

let flushBound = false;

/** Bind online listener once (call from app layout / status bar). */
export function bindSpaceOutboxFlush() {
  if (typeof window === "undefined" || flushBound) return;
  flushBound = true;
  const run = () => {
    void flushSpaceOutbox();
  };
  window.addEventListener("online", run);
  if (navigator.onLine) {
    window.setTimeout(run, 1500);
  }
}
