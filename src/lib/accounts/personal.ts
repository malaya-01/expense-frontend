import type { FinancialContainer } from "@/types";

/** Space shared wallets belong in Spaces only, not personal Accounts. */
export function isSpaceLinkedAccount(
  account: Pick<FinancialContainer, "space_id" | "name" | "notes">,
): boolean {
  if (account.space_id) return true;
  const notes = String(account.notes || "");
  if (notes.startsWith("Wallet for ")) return true;
  return account.name.trim().toLowerCase() === "shared wallet";
}

export function personalAccounts<T extends FinancialContainer>(
  accounts: T[],
): T[] {
  return accounts.filter((account) => !isSpaceLinkedAccount(account));
}
