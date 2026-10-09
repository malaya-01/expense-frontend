import { isLiquidType } from "@/lib/accounts/types-meta";
import type { CreateTransactionInput, FinancialContainer } from "@/types";

/**
 * One-tap actions for accounts that track money owed (payables, receivables,
 * credit cards, loans). Each opens "New transaction" already set up as the
 * right kind of entry, so a debt payment can't accidentally be recorded as a
 * plain expense that never reduces what you owe.
 */
export type AccountQuickAction = {
  id: string;
  label: string;
  title: string;
  notice: string;
  defaults: Partial<CreateTransactionInput>;
};

/** Where everyday money comes from / goes to: preferred, else the richest bank/cash. */
export function everydayAccount(
  accounts: FinancialContainer[],
  preferredId?: string | null,
  exclude?: string,
): FinancialContainer | undefined {
  const liquid = accounts.filter(
    (a) => a.id !== exclude && isLiquidType(a.type) && !a.space_id,
  );
  return (
    liquid.find((a) => a.id === preferredId) ||
    [...liquid].sort((a, b) => Number(b.balance) - Number(a.balance))[0]
  );
}

export function accountQuickActions(
  account: FinancialContainer,
  accounts: FinancialContainer[],
  preferredId?: string | null,
): AccountQuickAction[] {
  const bank = everydayAccount(accounts, preferredId, account.id);
  const bankId = bank?.id || "";
  const bankName = bank?.name || "your bank account";
  const name = account.name;

  switch (account.type) {
    case "payable":
      return [
        {
          id: "pay-back",
          label: "Pay back",
          title: `Pay back ${name}`,
          notice: `Money leaves ${bankName} and what you owe ${name} goes down by the same amount.`,
          defaults: {
            type: "transfer",
            source_container_id: bankId,
            destination_container_id: account.id,
            description: `Paid back ${name}`,
          },
        },
        {
          id: "owe-more",
          label: "They paid for me",
          title: `${name} paid for something`,
          notice: `Use this when ${name} paid on your behalf. Pick what it was for as the category — it counts as your spending and what you owe ${name} goes up.`,
          defaults: {
            type: "expense",
            source_container_id: account.id,
            description: "",
          },
        },
        {
          id: "borrow-cash",
          label: "Borrowed cash",
          title: `Borrowed from ${name}`,
          notice: `The money arrives in ${bankName} and what you owe ${name} goes up.`,
          defaults: {
            type: "transfer",
            source_container_id: account.id,
            destination_container_id: bankId,
            description: `Borrowed from ${name}`,
          },
        },
      ];
    case "receivable":
      return [
        {
          id: "got-back",
          label: "Got paid back",
          title: `${name} paid you back`,
          notice: `The money arrives in ${bankName} and what ${name} owes you goes down.`,
          defaults: {
            type: "transfer",
            source_container_id: account.id,
            destination_container_id: bankId,
            description: `Received from ${name}`,
          },
        },
        {
          id: "lend",
          label: "Lend / paid for them",
          title: `Lend to ${name}`,
          notice: `Money leaves ${bankName} and what ${name} owes you goes up. Use this too when you paid for ${name}'s share.`,
          defaults: {
            type: "transfer",
            source_container_id: bankId,
            destination_container_id: account.id,
            description: `Lent to ${name}`,
          },
        },
      ];
    case "credit_card":
      return [
        {
          id: "pay-bill",
          label: "Pay bill",
          title: `Pay ${name} bill`,
          notice: `Money leaves ${bankName} and the amount due on ${name} goes down. This is a transfer, not spending — the spending was recorded when you used the card.`,
          defaults: {
            type: "transfer",
            source_container_id: bankId,
            destination_container_id: account.id,
            description: `${name} bill payment`,
          },
        },
        {
          id: "card-spend",
          label: "Card spend",
          title: `Spent on ${name}`,
          notice: `Counts as your spending and the amount due on ${name} goes up.`,
          defaults: {
            type: "expense",
            source_container_id: account.id,
            description: "",
          },
        },
      ];
    case "loan":
      return [
        {
          id: "pay-loan",
          label: "Make payment",
          title: `Pay ${name}`,
          notice: `Money leaves ${bankName} and the outstanding on ${name} goes down. For EMIs with interest, use Loans & Debts → Record payment.`,
          defaults: {
            type: "transfer",
            source_container_id: bankId,
            destination_container_id: account.id,
            description: `${name} payment`,
          },
        },
      ];
    default:
      return [];
  }
}
