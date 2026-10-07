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

type PayloadMode = "create" | "update";

/**
 * Optional clearable field. On update: undefined = not provided (leave as
 * is); an explicitly emptied value ("" / null) = clear → null.
 */
function clearable(
  value: string | null | undefined,
  mode: PayloadMode,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value) return value;
  return mode === "update" ? null : undefined;
}

function apiPayload(
  payload: Partial<CreateTransactionInput>,
  currency: string | undefined,
  mode: PayloadMode,
): Record<string, unknown> {
  const loose = payload as {
    category_id?: string | null;
    merchant?: string | null;
    notes?: string | null;
  };
  return {
    type: payload.type,
    amount:
      payload.amount != null ? Number(payload.amount) : undefined,
    description: payload.description,
    date: payload.date,
    category_id: clearable(loose.category_id, mode),
    source_container_id: payload.source_container_id || undefined,
    destination_container_id: payload.destination_container_id || undefined,
    merchant: clearable(loose.merchant, mode),
    notes: clearable(loose.notes, mode),
    currency: currency || payload.currency || undefined,
    exchange_rate: payload.exchange_rate,
    payment_method: payload.payment_method || undefined,
    upi_vpa: payload.upi_vpa || undefined,
    upi_txn_id: payload.upi_txn_id || undefined,
    payment_status: payload.payment_status || undefined,
    paid_at: payload.paid_at || undefined,
    platform: payload.platform || undefined,
    platform_txn_id: payload.platform_txn_id || undefined,
    receipt_id: payload.receipt_id || undefined,
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
  mode: PayloadMode = "create",
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

  const isUpdate = mode === "update";
  return {
    ...apiPayload(payload, derivedCurrency || undefined, mode),
    currency: derivedCurrency || undefined,
    source_name:
      (source as { name?: string } | undefined)?.name ||
      payload.source_name ||
      null,
    source_currency:
      (source as { currency?: string } | undefined)?.currency ??
      (isUpdate ? undefined : null),
    destination_name:
      (destination as { name?: string } | undefined)?.name ||
      payload.destination_name ||
      null,
    destination_currency:
      (destination as { currency?: string } | undefined)?.currency ??
      (isUpdate ? undefined : null),
    category_name:
      (category as { name?: string } | undefined)?.name ||
      // Category explicitly cleared on edit → drop the stale display name.
      (isUpdate && payload.category_id !== undefined && !payload.category_id
        ? null
        : payload.category_name) ||
      null,
    amount_base:
      payload.amount != null ? Number(payload.amount) : undefined,
    // Partial updates must not reset the rate to 1 when it wasn't edited.
    exchange_rate: isUpdate ? payload.exchange_rate : payload.exchange_rate ?? 1,
    fx_rate_to_base: isUpdate ? undefined : 1,
    // On update only touch receipt fields that were actually provided.
    receipt_id: isUpdate
      ? clearable(payload.receipt_id, mode)
      : payload.receipt_id || null,
    receipt_url: isUpdate
      ? payload.receipt_url
      : payload.receipt_url || null,
    receipt_mime: isUpdate
      ? payload.receipt_mime
      : payload.receipt_mime || null,
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
  const enriched = await enrichTransactionFields(
    {
      type: payload.type || existing?.type,
      source_name: existing?.source_name,
      destination_name: existing?.destination_name,
      category_name: existing?.category_name,
      ...payload,
    },
    "update",
  );
  const updated = (await transactionsRepo.update(
    id,
    enriched,
  )) as LedgerTransaction;
  return normalizeTx(updated);
}

export async function deleteTransaction(id: string): Promise<void> {
  await transactionsRepo.remove(id);
}
