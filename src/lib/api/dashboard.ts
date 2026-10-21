import { api, unwrap } from "./client";
import { offlineDb } from "@/lib/offline/db";
import { getActiveOfflineUserId } from "@/lib/offline/clear-session";
import {
  getHydrateGeneration,
  markHydrateFresh,
} from "@/lib/offline/hydrate-cache";

type Row = {
  id?: string | number;
  user_id?: string | null;
  _pending?: boolean;
  _sync_failed?: boolean;
  deleted_at?: string | null;
};

type DashboardPayload = {
  generated_at: string;
  transactions_since: string;
  accounts: Row[] | null;
  transactions: Row[] | null;
  budgets: Row[] | null;
  goals: Row[] | null;
  investments: { holdings?: Row[] } | null;
  /** Sections the server could not load. */
  failed: string[];
};

/**
 * Merge server rows into the device cache without touching unsynced local
 * work (same rule as the per-table hydrate).
 */
async function mergeRows(table: string, rows: Row[], ownerId: string | null) {
  const store = offlineDb.table(table);
  const existing = (await store.toArray()) as Row[];
  const localById = new Map(existing.map((row) => [String(row.id), row]));
  const next = rows.flatMap((row) => {
    if (row?.id == null) return [];
    const id = String(row.id);
    const local = localById.get(id);
    if (local?._pending || local?._sync_failed || local?.deleted_at) return [];
    return [
      {
        ...row,
        id,
        user_id: row.user_id || ownerId,
        _pending: false,
        _sync_failed: false,
      },
    ];
  });
  if (next.length) await store.bulkPut(next);
}

/**
 * Refresh everything the overview screen shows with ONE request (it used to
 * take five list calls, one of them the user's entire transaction history).
 * Results land in the device cache; the page then reads the cache, so
 * offline / pending rows still show.
 */
export async function refreshDashboard(): Promise<{ failed: string[] }> {
  const ownerId = getActiveOfflineUserId();
  const tables = ["accounts", "transactions", "budgets", "goals", "investments"];
  const generations = new Map(
    tables.map((table) => [table, getHydrateGeneration(table)]),
  );
  const res = await api.get("/dashboard");
  const data = unwrap<DashboardPayload>(res);
  // A local write since the request started wins over this snapshot.
  const current = (table: string) =>
    getHydrateGeneration(table) === generations.get(table);

  const sections: Array<[string, Row[] | null | undefined, boolean]> = [
    ["accounts", data.accounts, true],
    // Only the last 12 months: never mark the full ledger as fresh.
    ["transactions", data.transactions, false],
    ["budgets", data.budgets, true],
    ["goals", data.goals, true],
    ["investments", data.investments?.holdings, true],
  ];
  for (const [table, rows, complete] of sections) {
    if (!Array.isArray(rows) || !current(table)) continue;
    await mergeRows(table, rows, ownerId);
    if (complete) markHydrateFresh(table);
  }
  return { failed: Array.isArray(data.failed) ? data.failed : [] };
}
