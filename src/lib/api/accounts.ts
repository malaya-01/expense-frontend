import type { CreateContainerInput, FinancialContainer } from "@/types";
import { accountsRepo } from "@/lib/offline/repos";
import { personalAccounts } from "@/lib/accounts/personal";

export async function listAccounts(
  _userId?: string,
): Promise<FinancialContainer[]> {
  const rows = (await accountsRepo.list()) as FinancialContainer[];
  return personalAccounts(rows);
}

export async function createAccount(
  _userId: string,
  payload: CreateContainerInput,
): Promise<FinancialContainer> {
  return accountsRepo.create(payload as any) as Promise<FinancialContainer>;
}

export async function updateAccount(
  _userId: string,
  id: string,
  payload: Partial<CreateContainerInput>,
): Promise<FinancialContainer> {
  return accountsRepo.update(id, payload as any) as Promise<FinancialContainer>;
}

export async function deleteAccount(
  _userId: string,
  id: string,
): Promise<void> {
  await accountsRepo.remove(id);
}

export async function getAccount(id: string): Promise<FinancialContainer> {
  return accountsRepo.get(id) as Promise<FinancialContainer>;
}
