import type { TransactionType } from "@/types";

/** Text colour for a transaction amount: expenses red, income green, transfers neutral. */
export function transactionAmountClass(type?: TransactionType | null): string {
  if (type === "expense") return "text-[var(--ds-status-red)]";
  if (type === "income") return "text-[var(--ds-status-green)]";
  return "text-[var(--ds-gray-1000)]";
}
