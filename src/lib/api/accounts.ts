import { api, unwrap } from "./client";
import type { CreateContainerInput, FinancialContainer } from "@/types";
import {
  createContainer as createLocal,
  deleteContainer as deleteLocal,
  listContainers as listLocal,
  updateContainer as updateLocal,
} from "@/lib/accounts/store";

function normalize(row: FinancialContainer): FinancialContainer {
  return {
    ...row,
    balance: Number(row.balance),
    include_in_net_worth: Boolean(row.include_in_net_worth),
  };
}

export async function listAccounts(
  userId?: string,
): Promise<FinancialContainer[]> {
  try {
    const res = await api.get("/accounts");
    const data = unwrap<FinancialContainer[] | FinancialContainer>(res);
    const list = Array.isArray(data) ? data : data ? [data] : [];
    return list.map(normalize);
  } catch {
    return listLocal(userId);
  }
}

export async function createAccount(
  userId: string,
  payload: CreateContainerInput,
): Promise<FinancialContainer> {
  try {
    const res = await api.post("/accounts", payload);
    return normalize(unwrap<FinancialContainer>(res));
  } catch {
    return createLocal(userId, payload);
  }
}

export async function updateAccount(
  userId: string,
  id: string,
  payload: Partial<CreateContainerInput>,
): Promise<FinancialContainer> {
  try {
    const res = await api.patch(`/accounts/${id}`, payload);
    return normalize(unwrap<FinancialContainer>(res));
  } catch {
    const updated = updateLocal(id, payload);
    if (!updated) throw new Error("Container not found");
    return updated;
  }
}

export async function deleteAccount(
  userId: string,
  id: string,
): Promise<void> {
  try {
    await api.delete(`/accounts/${id}`);
  } catch {
    deleteLocal(id);
  }
}
