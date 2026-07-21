import { api, unwrap } from "./client";
import { toDateOnly } from "@/lib/format";
import type { CreateGoalInput, Goal } from "@/types";

function normalize(row: Goal): Goal {
  return {
    ...row,
    target_amount: Number(row.target_amount),
    current_amount: Number(row.current_amount),
    remaining: Number(row.remaining),
    percent: Number(row.percent),
    monthly_surplus: Number(row.monthly_surplus ?? 0),
    target_date: toDateOnly(row.target_date),
    predicted_date: toDateOnly(row.predicted_date),
  };
}

export async function listGoals(): Promise<Goal[]> {
  const res = await api.get("/goals");
  const data = unwrap<Goal[] | Goal>(res);
  const list = Array.isArray(data) ? data : data ? [data] : [];
  return list.map(normalize);
}

export async function createGoal(payload: CreateGoalInput): Promise<Goal> {
  const res = await api.post("/goals", payload);
  return normalize(unwrap<Goal>(res));
}

export async function updateGoal(
  id: string,
  payload: Partial<CreateGoalInput>,
): Promise<Goal> {
  const res = await api.patch(`/goals/${id}`, payload);
  return normalize(unwrap<Goal>(res));
}

export async function contributeToGoal(
  id: string,
  amount: number,
): Promise<Goal> {
  const res = await api.post(`/goals/${id}/contribute`, { amount });
  return normalize(unwrap<Goal>(res));
}

export async function deleteGoal(id: string): Promise<void> {
  await api.delete(`/goals/${id}`);
}
