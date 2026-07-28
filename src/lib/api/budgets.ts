import type { Budget, CreateBudgetInput } from "@/types";
import { budgetsRepo } from "@/lib/offline/repos";
import { offlineDb } from "@/lib/offline/db";

function normalize(row: any): Budget {
  return {
    ...row,
    amount: Number(row.amount || 0),
    spent: Number(row.spent || 0),
    remaining: Number(
      row.remaining ?? Number(row.amount || 0) - Number(row.spent || 0),
    ),
    percent: Number(row.percent || 0),
    _pending: Boolean(row._pending),
    _sync_failed: Boolean(row._sync_failed),
  };
}

async function enrich(payload: Partial<CreateBudgetInput>) {
  let category_name: string | null = null;
  let category_color: string | null = null;
  if (payload.category_id) {
    const cat = await offlineDb.categories.get(payload.category_id);
    category_name = (cat as any)?.name ?? null;
    category_color = (cat as any)?.color ?? null;
  }
  return {
    ...payload,
    currency: (payload.currency || "USD").toUpperCase(),
    category_name,
    category_color,
    spent: 0,
    remaining: Number(payload.amount || 0),
    percent: 0,
    status: "on_track",
  };
}

export async function listBudgets(): Promise<Budget[]> {
  const rows = await budgetsRepo.list();
  return rows.map(normalize);
}

export async function createBudget(
  payload: CreateBudgetInput,
): Promise<Budget> {
  return normalize(await budgetsRepo.create((await enrich(payload)) as any));
}

export async function updateBudget(
  id: string,
  payload: Partial<CreateBudgetInput>,
): Promise<Budget> {
  return normalize(
    await budgetsRepo.update(id, (await enrich(payload)) as any),
  );
}

export async function deleteBudget(id: string): Promise<void> {
  await budgetsRepo.remove(id);
}
