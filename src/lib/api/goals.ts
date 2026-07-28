import { toDateOnly } from "@/lib/format";
import type { CreateGoalInput, Goal } from "@/types";
import { contributeGoalLocal, goalsRepo } from "@/lib/offline/repos";
import { offlineDb } from "@/lib/offline/db";

function normalize(row: any): Goal {
  return {
    ...row,
    target_amount: Number(row.target_amount || 0),
    current_amount: Number(row.current_amount || 0),
    remaining: Number(
      row.remaining ??
        Number(row.target_amount || 0) - Number(row.current_amount || 0),
    ),
    percent: Number(row.percent || 0),
    monthly_surplus: Number(row.monthly_surplus ?? 0),
    target_date: toDateOnly(row.target_date),
    predicted_date: toDateOnly(row.predicted_date),
    _pending: Boolean(row._pending),
    _sync_failed: Boolean(row._sync_failed),
  };
}

async function enrich(payload: Partial<CreateGoalInput>) {
  let container_name: string | null = null;
  if (payload.container_id) {
    const account = await offlineDb.accounts.get(payload.container_id);
    container_name = (account as any)?.name ?? null;
  }
  const target = Number(payload.target_amount || 0);
  const current = Number(payload.current_amount || 0);
  return {
    ...payload,
    currency: (payload.currency || "USD").toUpperCase(),
    container_name,
    remaining: target - current,
    percent: target > 0 ? (current / target) * 100 : 0,
    status: "on_track",
    progress_source: payload.container_id ? "container" : "manual",
    monthly_surplus: 0,
  };
}

export async function listGoals(): Promise<Goal[]> {
  const rows = await goalsRepo.list();
  return rows.map(normalize);
}

export async function createGoal(payload: CreateGoalInput): Promise<Goal> {
  return normalize(await goalsRepo.create((await enrich(payload)) as any));
}

export async function updateGoal(
  id: string,
  payload: Partial<CreateGoalInput>,
): Promise<Goal> {
  return normalize(await goalsRepo.update(id, (await enrich(payload)) as any));
}

export async function contributeToGoal(
  id: string,
  amount: number,
): Promise<Goal> {
  const row = await contributeGoalLocal(id, { amount });
  return normalize(row || { id, current_amount: amount, _pending: true });
}

export async function deleteGoal(id: string): Promise<void> {
  await goalsRepo.remove(id);
}
