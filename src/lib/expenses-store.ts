import type { CreateExpenseInput, Expense } from "@/types";

const STORAGE_KEY = "expense-tracker:expenses";

function readAll(): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Expense[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: Expense[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function listLocalExpenses(userId?: string): Expense[] {
  const all = readAll();
  if (!userId) return all;
  return all.filter((e) => e.user_id === userId);
}

export function createLocalExpense(
  userId: string,
  input: CreateExpenseInput,
): Expense {
  const now = new Date().toISOString();
  const expense: Expense = {
    id: uid(),
    user_id: userId,
    amount: Number(input.amount),
    description: input.description,
    date: input.date,
    time: input.time ?? null,
    category_id: input.category_id ?? null,
    merchant: input.merchant ?? null,
    payment_method: input.payment_method ?? null,
    currency: input.currency ?? "USD",
    notes: input.notes ?? null,
    is_recurring: input.is_recurring ?? false,
    created_at: now,
    updated_at: now,
  };
  const all = readAll();
  all.unshift(expense);
  writeAll(all);
  return expense;
}

export function updateLocalExpense(
  id: string,
  input: Partial<CreateExpenseInput>,
): Expense | null {
  const all = readAll();
  const index = all.findIndex((e) => e.id === id);
  if (index < 0) return null;
  const current = all[index];
  const updated: Expense = {
    ...current,
    ...input,
    amount: input.amount !== undefined ? Number(input.amount) : current.amount,
    updated_at: new Date().toISOString(),
  };
  all[index] = updated;
  writeAll(all);
  return updated;
}

export function deleteLocalExpense(id: string): boolean {
  const all = readAll();
  const next = all.filter((e) => e.id !== id);
  if (next.length === all.length) return false;
  writeAll(next);
  return true;
}

export function getLocalExpense(id: string): Expense | null {
  return readAll().find((e) => e.id === id) ?? null;
}
