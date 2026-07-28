import { api, unwrap } from "./client";
import type {
  CreateTransactionInput,
  LedgerJournal,
  LedgerTransaction,
} from "@/types";
import { transactionsRepo } from "@/lib/offline/repos";
import { offlineDb } from "@/lib/offline/db";
import { requireDateOnly } from "@/lib/format";

type TxRow = LedgerTransaction & { _pending?: boolean };

function apiPayload(
  payload: Partial<CreateTransactionInput>,
  currency?: string,
): Record<string, unknown> {
  return {
    type: payload.type,
    amount:
      payload.amount != null ? Number(payload.amount) : undefined,
    description: payload.description,
    date: payload.date,
    category_id: payload.category_id || undefined,
    source_container_id: payload.source_container_id || undefined,
    destination_container_id: payload.destination_container_id || undefined,
    merchant: payload.merchant || undefined,
    notes: payload.notes || undefined,
    currency: currency || payload.currency || undefined,
    exchange_rate: payload.exchange_rate,
  };
}

async function enrichTransactionFields(
  payload: Partial<CreateTransactionInput> & {
    source_container_id?: string | null;
    destination_container_id?: string | null;
    category_id?: string | null;
    source_name?: string | null;
    destination_name?: string | null;
    category_name?: string | null;
  },
): Promise<Record<string, unknown>> {
  const sourceId = payload.source_container_id || undefined;
  const destId = payload.destination_container_id || undefined;
  const categoryId = payload.category_id || undefined;

  const [source, destination, category] = await Promise.all([
    sourceId ? offlineDb.accounts.get(sourceId) : undefined,
    destId ? offlineDb.accounts.get(destId) : undefined,
    categoryId ? offlineDb.categories.get(categoryId) : undefined,
  ]);

  const derivedCurrency = (
    payload.currency ||
    (payload.type === "expense" || payload.type === "transfer"
      ? (source as { currency?: string } | undefined)?.currency
      : (destination as { currency?: string } | undefined)?.currency) ||
    (source as { currency?: string } | undefined)?.currency ||
    (destination as { currency?: string } | undefined)?.currency ||
    ""
  )
    .toString()
    .toUpperCase();

  return {
    ...apiPayload(payload, derivedCurrency || undefined),
    currency: derivedCurrency || undefined,
    source_name:
      (source as { name?: string } | undefined)?.name ||
      payload.source_name ||
      null,
    source_currency:
      (source as { currency?: string } | undefined)?.currency ?? null,
    destination_name:
      (destination as { name?: string } | undefined)?.name ||
      payload.destination_name ||
      null,
    destination_currency:
      (destination as { currency?: string } | undefined)?.currency ?? null,
    category_name:
      (category as { name?: string } | undefined)?.name ||
      payload.category_name ||
      null,
    amount_base:
      payload.amount != null ? Number(payload.amount) : undefined,
    exchange_rate: payload.exchange_rate ?? 1,
    fx_rate_to_base: 1,
  };
}

function normalizeTx(row: any): LedgerTransaction {
  return {
    ...row,
    amount: Number(row.amount),
    exchange_rate: Number(row.exchange_rate ?? 1),
    fx_rate_to_base: Number(row.fx_rate_to_base ?? 1),
    amount_base: Number(row.amount_base ?? row.amount),
    date: requireDateOnly(row.date),
  } as LedgerTransaction;
}

async function backfillDisplayFields(tx: TxRow): Promise<TxRow> {
  const needsName =
    (Boolean(tx.source_container_id) && !tx.source_name) ||
    (Boolean(tx.destination_container_id) && !tx.destination_name);
  const needsCurrency = !tx.currency;
  if (!needsName && !needsCurrency) return tx;

  const enriched = await enrichTransactionFields({
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    date: tx.date,
    category_id: tx.category_id || undefined,
    source_container_id: tx.source_container_id || undefined,
    destination_container_id: tx.destination_container_id || undefined,
    merchant: tx.merchant || undefined,
    notes: tx.notes || undefined,
    currency: tx.currency,
    exchange_rate: tx.exchange_rate,
    source_name: tx.source_name,
    destination_name: tx.destination_name,
    category_name: tx.category_name,
  });
  const merged = normalizeTx({ ...tx, ...enriched, id: tx.id });
  await offlineDb.transactions.put({
    ...merged,
    id: tx.id,
    _pending: Boolean(tx._pending),
    _sync_failed: Boolean(tx._sync_failed),
  } as any);
  return {
    ...merged,
    _pending: tx._pending,
    _sync_failed: tx._sync_failed,
  };
}

export async function listTransactions(): Promise<LedgerTransaction[]> {
  const rows = (await transactionsRepo.list()) as TxRow[];
  return Promise.all(rows.map((tx) => backfillDisplayFields(tx)));
}

export async function getTransaction(id: string): Promise<LedgerTransaction> {
  const tx = (await transactionsRepo.get(id)) as TxRow;
  return backfillDisplayFields(tx);
}

export async function getTransactionJournal(
  id: string,
): Promise<LedgerJournal[]> {
  const res = await api.get(`/transactions/${id}/journal`);
  const data = unwrap<LedgerJournal[] | LedgerJournal>(res);
  return Array.isArray(data) ? data : data ? [data] : [];
}

export async function createTransaction(
  payload: CreateTransactionInput & {
    source_name?: string | null;
    destination_name?: string | null;
    category_name?: string | null;
  },
): Promise<LedgerTransaction> {
  const enriched = await enrichTransactionFields(payload);
  // Outbox keeps API fields only; local row keeps join/display fields.
  const created = (await transactionsRepo.create(
    enriched,
  )) as LedgerTransaction;
  return normalizeTx(created);
}

export async function updateTransaction(
  id: string,
  payload: Partial<CreateTransactionInput> & {
    source_name?: string | null;
    destination_name?: string | null;
    category_name?: string | null;
  },
): Promise<LedgerTransaction> {
  const existing = (await offlineDb.transactions.get(id)) as
    | TxRow
    | undefined;
  const enriched = await enrichTransactionFields({
    type: payload.type || existing?.type,
    source_name: existing?.source_name,
    destination_name: existing?.destination_name,
    category_name: existing?.category_name,
    ...payload,
  });
  const updated = (await transactionsRepo.update(
    id,
    enriched,
  )) as LedgerTransaction;
  return normalizeTx(updated);
}

export async function deleteTransaction(id: string): Promise<void> {
  await transactionsRepo.remove(id);
}
