import { api, unwrap } from "./client";
import { requireDateOnly } from "@/lib/format";
import type {
  CreateTransactionInput,
  LedgerJournal,
  LedgerTransaction,
} from "@/types";

function normalize(row: LedgerTransaction): LedgerTransaction {
  return {
    ...row,
    amount: Number(row.amount),
    exchange_rate: Number(row.exchange_rate ?? 1),
    fx_rate_to_base: Number(row.fx_rate_to_base ?? 1),
    amount_base: Number(row.amount_base ?? row.amount),
    date: requireDateOnly(row.date),
  };
}

export async function listTransactions(): Promise<LedgerTransaction[]> {
  const res = await api.get("/transactions");
  const data = unwrap<LedgerTransaction[] | LedgerTransaction>(res);
  const list = Array.isArray(data) ? data : data ? [data] : [];
  return list.map(normalize);
}

export async function getTransaction(id: string): Promise<LedgerTransaction> {
  const res = await api.get(`/transactions/${id}`);
  return normalize(unwrap<LedgerTransaction>(res));
}

export async function getTransactionJournal(
  id: string,
): Promise<LedgerJournal[]> {
  const res = await api.get(`/transactions/${id}/journal`);
  const data = unwrap<LedgerJournal[] | LedgerJournal>(res);
  return Array.isArray(data) ? data : data ? [data] : [];
}

export async function createTransaction(
  payload: CreateTransactionInput,
): Promise<LedgerTransaction> {
  const res = await api.post("/transactions", payload);
  return normalize(unwrap<LedgerTransaction>(res));
}

export async function updateTransaction(
  id: string,
  payload: Partial<CreateTransactionInput>,
): Promise<LedgerTransaction> {
  const res = await api.patch(`/transactions/${id}`, payload);
  return normalize(unwrap<LedgerTransaction>(res));
}

export async function deleteTransaction(id: string): Promise<void> {
  await api.delete(`/transactions/${id}`);
}
