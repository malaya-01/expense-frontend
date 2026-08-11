/**
 * Offline-aware API facades.
 * Pages keep importing from @/lib/api/* — those modules delegate here.
 */

import { api, unwrap } from "@/lib/api/client";
import { requireDateOnly } from "@/lib/format";
import type {
  CreateContainerInput,
  CreateTransactionInput,
  FinancialContainer,
  LedgerTransaction,
  Category,
} from "@/types";
import { createRepository } from "@/lib/offline/repository";
import { enqueueOutbox } from "@/lib/offline/outbox";
import { isOnline } from "@/lib/offline/network";
import { scheduleSync } from "@/lib/offline/sync-engine";
import { offlineDb, newId } from "@/lib/offline/db";

function normalizeAccount(row: any): FinancialContainer {
  return {
    ...row,
    balance: Number(row.balance),
    include_in_net_worth: row.include_in_net_worth !== false,
    _pending: Boolean(row._pending),
    _sync_failed: Boolean(row._sync_failed),
  } as FinancialContainer;
}

function normalizeTx(row: any): LedgerTransaction {
  return {
    ...row,
    amount: Number(row.amount),
    exchange_rate: Number(row.exchange_rate ?? 1),
    fx_rate_to_base: Number(row.fx_rate_to_base ?? 1),
    amount_base: Number(row.amount_base ?? row.amount),
    date: requireDateOnly(row.date),
    _pending: Boolean(row._pending),
    _sync_failed: Boolean(row._sync_failed),
  } as LedgerTransaction;
}

function normalizeCategory(row: any): Category {
  return {
    ...row,
    budget_amount:
      row.budget_amount == null ? undefined : Number(row.budget_amount),
    spent_amount:
      row.spent_amount == null ? undefined : Number(row.spent_amount),
    transaction_count:
      row.transaction_count == null ? undefined : Number(row.transaction_count),
    _pending: Boolean(row._pending),
    _sync_failed: Boolean(row._sync_failed),
  } as Category;
}

export const accountsRepo = createRepository<FinancialContainer & { id: string }>({
  entityType: "account",
  table: "accounts",
  normalize: normalizeAccount as any,
  remoteList: async () => {
    const res = await api.get("/accounts");
    const data = unwrap<FinancialContainer[] | FinancialContainer>(res);
    const list = Array.isArray(data) ? data : data ? [data] : [];
    return list.map(normalizeAccount) as any;
  },
  remoteGet: async (id) => {
    const res = await api.get(`/accounts/${id}`);
    return normalizeAccount(unwrap(res)) as any;
  },
});

export const transactionsRepo = createRepository<
  LedgerTransaction & { id: string }
>({
  entityType: "transaction",
  table: "transactions",
  normalize: normalizeTx as any,
  remoteList: async () => {
    const res = await api.get("/transactions");
    const data = unwrap<LedgerTransaction[] | LedgerTransaction>(res);
    const list = Array.isArray(data) ? data : data ? [data] : [];
    return list.map(normalizeTx) as any;
  },
  remoteGet: async (id) => {
    const res = await api.get(`/transactions/${id}`);
    return normalizeTx(unwrap(res)) as any;
  },
});

export const categoriesRepo = createRepository<Category & { id: string }>({
  entityType: "category",
  table: "categories",
  normalize: normalizeCategory as any,
  remoteList: async () => {
    const res = await api.get("/categories");
    const data = unwrap<Category[] | Category>(res);
    const list = Array.isArray(data) ? data : data ? [data] : [];
    return list.map(normalizeCategory) as any;
  },
  remoteGet: async (id) => {
    const res = await api.get(`/categories/${id}`);
    return normalizeCategory(unwrap(res)) as any;
  },
});

function genericNormalize(row: any) {
  return {
    ...row,
    id: String(row.id),
    _pending: Boolean(row._pending),
    _sync_failed: Boolean(row._sync_failed),
  };
}

export const budgetsRepo = createRepository({
  entityType: "budget",
  table: "budgets",
  normalize: genericNormalize,
  remoteList: async () => {
    const res = await api.get("/budgets");
    const data = unwrap<any[] | any>(res);
    return (Array.isArray(data) ? data : data ? [data] : []).map(
      genericNormalize,
    );
  },
});

export const goalsRepo = createRepository({
  entityType: "goal",
  table: "goals",
  normalize: genericNormalize,
  remoteList: async () => {
    const res = await api.get("/goals");
    const data = unwrap<any[] | any>(res);
    return (Array.isArray(data) ? data : data ? [data] : []).map(
      genericNormalize,
    );
  },
});

export const investmentsRepo = createRepository({
  entityType: "investment",
  table: "investments",
  normalize: genericNormalize,
  remoteList: async () => {
    const res = await api.get("/investments");
    const data = unwrap<any[] | any>(res);
    return (Array.isArray(data) ? data : data ? [data] : []).map(
      genericNormalize,
    );
  },
});

export const loansRepo = createRepository({
  entityType: "loan",
  table: "loans",
  normalize: genericNormalize,
  remoteList: async () => {
    const res = await api.get("/loans");
    const data = unwrap<any[] | any>(res);
    return (Array.isArray(data) ? data : data ? [data] : []).map(
      genericNormalize,
    );
  },
});

export const recurringRepo = createRepository({
  entityType: "recurring",
  table: "recurring",
  normalize: genericNormalize,
  remoteList: async () => {
    const res = await api.get("/recurring");
    const data = unwrap<any[] | any>(res);
    return (Array.isArray(data) ? data : data ? [data] : []).map(
      genericNormalize,
    );
  },
});

export async function saveUserSettingsLocal(
  userId: string,
  payload: Record<string, unknown>,
) {
  const existing = await offlineDb.user_settings.get(userId);
  const next = {
    ...(existing || {}),
    ...payload,
    id: userId,
    updated_at: new Date().toISOString(),
    _pending: true,
  };
  await offlineDb.user_settings.put(next);
  await enqueueOutbox({
    entity_type: "user_settings",
    entity_id: userId,
    op: "update",
    payload,
    base_sync_version: Number(existing?.sync_version || 1),
  });
  if (isOnline()) scheduleSync("user_settings");
  return next;
}

export async function saveNotificationPreferences(
  userId: string,
  preferences: Record<string, unknown>,
) {
  const existing = await offlineDb.notification_preferences.get(userId);
  const next = {
    id: userId,
    user_id: userId,
    preferences,
    updated_at: new Date().toISOString(),
    sync_version: Number(existing?.sync_version || 1),
    _pending: true,
  };
  await offlineDb.notification_preferences.put(next);
  await enqueueOutbox({
    entity_type: "notification_preferences",
    entity_id: userId,
    op: "update",
    payload: { preferences },
    base_sync_version: Number(existing?.sync_version || 1),
  });
  if (isOnline()) scheduleSync("notification_preferences");
  return next;
}

export async function saveAiPreferences(
  userId: string,
  payload: Record<string, unknown>,
) {
  const existing = await offlineDb.ai_preferences.get(userId);
  const next = {
    ...(existing || {}),
    ...payload,
    id: userId,
    user_id: userId,
    updated_at: new Date().toISOString(),
    _pending: true,
  };
  await offlineDb.ai_preferences.put(next);
  await enqueueOutbox({
    entity_type: "ai_preferences",
    entity_id: userId,
    op: "update",
    payload,
    base_sync_version: Number(existing?.sync_version || 1),
  });
  if (isOnline()) scheduleSync("ai_preferences");
  return next;
}

export async function addAiMemoryLocal(
  userId: string,
  content: string,
) {
  const id = newId();
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: userId,
    content,
    source: "user",
    created_at: now,
    updated_at: now,
    sync_version: 1,
    _pending: true,
  };
  await offlineDb.ai_memories.put(row);
  await enqueueOutbox({
    entity_type: "ai_memory",
    entity_id: id,
    op: "create",
    payload: { id, content, source: "user" },
    base_sync_version: 1,
  });
  if (isOnline()) scheduleSync("ai_memory");
  return row;
}

export async function contributeGoalLocal(
  id: string,
  payload: Record<string, unknown>,
) {
  const existing = await offlineDb.goals.get(id);
  if (existing) {
    const nextAmount =
      Number(existing.current_amount || 0) + Number(payload.amount || 0);
    await offlineDb.goals.put({
      ...existing,
      current_amount: nextAmount,
      updated_at: new Date().toISOString(),
      _pending: true,
    });
  }
  await enqueueOutbox({
    entity_type: "goal_contribute",
    entity_id: id,
    op: "contribute",
    payload,
    base_sync_version: Number(existing?.sync_version || 1),
  });
  if (isOnline()) scheduleSync("goal_contribute");
  return offlineDb.goals.get(id);
}

export async function loanPaymentLocal(
  id: string,
  payload: Record<string, unknown>,
) {
  await enqueueOutbox({
    entity_type: "loan_payment",
    entity_id: id,
    op: "payment",
    payload,
  });
  if (isOnline()) scheduleSync("loan_payment");
}

export async function recurringExecuteLocal(id: string) {
  await enqueueOutbox({
    entity_type: "recurring_execute",
    entity_id: id,
    op: "execute",
    payload: {},
  });
  if (isOnline()) scheduleSync("recurring_execute");
}

export type { CreateContainerInput, CreateTransactionInput };
