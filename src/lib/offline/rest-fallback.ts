/**
 * When /api/sync/* is not deployed (404), flush the outbox through
 * the existing REST CRUD endpoints so the app still works.
 */

import axios from "axios";
import { api, unwrap } from "@/lib/api/client";
import type { OutboxItem, SyncEntityType } from "./db";

const TRANSACTION_WRITE_KEYS = [
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

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function cleanPayload(payload: Record<string, unknown>) {
  const {
    id: _id,
    _pending: _p,
    _sync_failed: _f,
    user_id: _uid,
    sync_version: _sv,
    created_at: _ca,
    updated_at: _ua,
    deleted_at: _da,
    source_name: _sn,
    destination_name: _dn,
    category_name: _cn,
    source_currency: _sc,
    destination_currency: _dc,
    receipt_url: _ru,
    receipt_mime: _rm,
    amount_base: _ab,
    fx_rate_to_base: _fx,
    spent: _spent,
    remaining: _rem,
    percent: _pct,
    status: _st,
    progress_source: _ps,
    monthly_surplus: _ms,
    ...rest
  } = payload;
  return rest;
}

function sanitizeTransactionPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const key of TRANSACTION_WRITE_KEYS) {
    const value = payload[key];
    if (isBlank(value)) continue;
    clean[key] = value;
  }
  return clean;
}

export function isTransientWriteError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (!error.response) return true;
  const status = error.response.status;
  return status === 408 || status === 429 || status >= 500;
}

export function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export async function pushOutboxItemViaRest(
  item: OutboxItem,
): Promise<Record<string, unknown> | null> {
  const raw = cleanPayload(item.payload || {});
  // Existing CRUD APIs on older deploys ignore/reject client ids — omit on create.
  const { id: _omitId, ...withoutId } = raw as Record<string, unknown> & {
    id?: string;
  };
  const id = item.entity_id;
  const type = item.entity_type as SyncEntityType;
  const payload =
    type === "transaction"
      ? sanitizeTransactionPayload(raw)
      : item.op === "create"
        ? withoutId
        : { ...withoutId };

  switch (type) {
    case "account":
      if (item.op === "create")
        return unwrap(await api.post("/accounts", payload));
      if (item.op === "update")
        return unwrap(await api.patch(`/accounts/${id}`, payload));
      if (item.op === "delete") {
        await api.delete(`/accounts/${id}`);
        return { id, deleted_at: new Date().toISOString() };
      }
      break;

    case "transaction":
      if (item.op === "create")
        return unwrap(await api.post("/transactions", payload));
      if (item.op === "update")
        return unwrap(await api.patch(`/transactions/${id}`, payload));
      if (item.op === "delete") {
        try {
          unwrap(await api.delete(`/transactions/${id}`));
        } catch (error) {
          if (!isNotFoundError(error)) throw error;
        }
        return { id, deleted_at: new Date().toISOString() };
      }
      break;

    case "category":
      if (item.op === "create")
        return unwrap(await api.post("/categories", payload));
      if (item.op === "update")
        return unwrap(await api.patch(`/categories/${id}`, payload));
      if (item.op === "delete") {
        await api.delete(`/categories/${id}`);
        return { id, deleted_at: new Date().toISOString() };
      }
      break;

    case "budget":
      if (item.op === "create")
        return unwrap(await api.post("/budgets", payload));
      if (item.op === "update")
        return unwrap(await api.patch(`/budgets/${id}`, payload));
      if (item.op === "delete") {
        await api.delete(`/budgets/${id}`);
        return { id, deleted_at: new Date().toISOString() };
      }
      break;

    case "goal":
      if (item.op === "create")
        return unwrap(await api.post("/goals", payload));
      if (item.op === "update")
        return unwrap(await api.patch(`/goals/${id}`, payload));
      if (item.op === "delete") {
        await api.delete(`/goals/${id}`);
        return { id, deleted_at: new Date().toISOString() };
      }
      break;

    case "goal_contribute":
      return unwrap(await api.post(`/goals/${id}/contribute`, payload));

    case "investment":
      if (item.op === "create")
        return unwrap(await api.post("/investments", payload));
      if (item.op === "update")
        return unwrap(await api.patch(`/investments/${id}`, payload));
      if (item.op === "delete") {
        await api.delete(`/investments/${id}`);
        return { id, deleted_at: new Date().toISOString() };
      }
      break;

    case "loan":
      if (item.op === "create")
        return unwrap(await api.post("/loans", payload));
      if (item.op === "update")
        return unwrap(await api.patch(`/loans/${id}`, payload));
      if (item.op === "delete") {
        await api.delete(`/loans/${id}`);
        return { id, deleted_at: new Date().toISOString() };
      }
      break;

    case "loan_payment":
      return unwrap(await api.post(`/loans/${id}/payments`, payload));

    case "recurring":
      if (item.op === "create")
        return unwrap(await api.post("/recurring", payload));
      if (item.op === "update")
        return unwrap(await api.patch(`/recurring/${id}`, payload));
      if (item.op === "delete") {
        await api.delete(`/recurring/${id}`);
        return { id, deleted_at: new Date().toISOString() };
      }
      break;

    case "recurring_execute":
      await api.post(`/recurring/${id}/execute`);
      return { id };

    case "user_settings":
      return unwrap(await api.patch("/user/profile", payload));

    case "notification_preferences":
      return unwrap(
        await api.patch("/user/notification-preferences", payload),
      );

    default:
      throw new Error(`No REST fallback for ${type}/${item.op}`);
  }

  throw new Error(`Unsupported op ${item.op} for ${type}`);
}

export async function hydrateViaRestLists(): Promise<void> {
  const { offlineDb } = await import("./db");
  const { getActiveOfflineUserId } = await import("./clear-session");
  const { getHydrateGeneration, runHydrate } = await import("./hydrate-cache");
  const ownerId = getActiveOfflineUserId();
  const endpoints: Array<{ path: string; table: string }> = [
    { path: "/accounts", table: "accounts" },
    { path: "/transactions", table: "transactions" },
    { path: "/categories", table: "categories" },
    { path: "/budgets", table: "budgets" },
    { path: "/goals", table: "goals" },
    { path: "/loans", table: "loans" },
    { path: "/recurring", table: "recurring" },
    { path: "/investments", table: "investments" },
  ];

  await Promise.all(
    endpoints.map(({ path, table }) =>
      runHydrate(table, async () => {
        const gen = getHydrateGeneration(table);
        const res = await api.get(path);
        if (getHydrateGeneration(table) !== gen) return;
        const data = unwrap<any>(res);
        let rows: any[] = [];
        if (Array.isArray(data)) rows = data;
        else if (Array.isArray(data?.holdings)) rows = data.holdings;
        else if (data?.id) rows = [data];

        const store = offlineDb.table(table);
        const existing = (await store.toArray()) as Array<{
          id: string;
          updated_at?: string;
          deleted_at?: string | null;
          _pending?: boolean;
          _sync_failed?: boolean;
        }>;
        const existingById = new Map(
          existing.map((row) => [String(row.id), row]),
        );
        const next = rows.flatMap((row) => {
          if (!row?.id) return [];
          const id = String(row.id);
          const local = existingById.get(id);
          if (local?._pending || local?._sync_failed || local?.deleted_at) {
            return [];
          }
          const remoteUpdated = Date.parse(String(row.updated_at || ""));
          const localUpdated = Date.parse(String(local?.updated_at || ""));
          if (
            Number.isFinite(remoteUpdated) &&
            Number.isFinite(localUpdated) &&
            localUpdated > remoteUpdated
          ) {
            return [];
          }
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
      }).catch(() => undefined),
    ),
  );
}

export function isSyncApiMissing(error: unknown): boolean {
  const status = (error as any)?.response?.status;
  const message = String((error as any)?.message || "");
  return (
    status === 404 ||
    /404|Cannot (GET|POST) \/api\/sync/i.test(message) ||
    /Request failed with status code 404/i.test(message)
  );
}
