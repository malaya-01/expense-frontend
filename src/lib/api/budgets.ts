import { api, unwrap } from "./client";
import type { Budget, CreateBudgetInput } from "@/types";

function normalize(row: Budget): Budget {
  return {
    ...row,
    amount: Number(row.amount),
    spent: Number(row.spent),
    remaining: Number(row.remaining),
    percent: Number(row.percent),
  };
}

export async function listBudgets(): Promise<Budget[]> {
  const res = await api.get("/budgets");
  const data = unwrap<Budget[] | Budget>(res);
  const list = Array.isArray(data) ? data : data ? [data] : [];
  return list.map(normalize);
}

export async function createBudget(
  payload: CreateBudgetInput,
): Promise<Budget> {
  const res = await api.post("/budgets", payload);
  return normalize(unwrap<Budget>(res));
}

export async function updateBudget(
  id: string,
  payload: Partial<CreateBudgetInput>,
): Promise<Budget> {
  const res = await api.patch(`/budgets/${id}`, payload);
  return normalize(unwrap<Budget>(res));
}

export async function deleteBudget(id: string): Promise<void> {
  await api.delete(`/budgets/${id}`);
}
