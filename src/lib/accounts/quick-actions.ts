import { isLiquidType } from "@/lib/accounts/types-meta";
import type {
  ContainerType,
  CreateTransactionInput,
  FinancialContainer,
} from "@/types";

/**
 * One-tap actions for accounts that track money owed.
 *
 * Payable: entries someone covered for you. Settling pays those entries
 * from an account you already have.
 * Receivable: money you paid for someone, taken from an account you already
 * have. Settling is them paying those entries back into one of your accounts.
 * Credit card: purchases sit on the card. Paying the bill is one payment
 * from your account, not a checklist of those purchases.
 */
export type EntryLock = {
  type?: boolean;
  source?: boolean;
  destination?: boolean;
  sourceTypes?: ContainerType[];
  destinationTypes?: ContainerType[];
};

export type AccountQuickAction = {
  id: string;
  label: string;
  title: string;
  notice: string;
  defaults: Partial<CreateTransactionInput>;
  /** People settle named entries. A card pays down the amount due. */
  settle?: "people" | "card";
  /** Keep the transaction form on the accounts this entry is allowed to use. */
  lock?: EntryLock;
};

const LIQUID: ContainerType[] = ["cash", "wallet", "bank"];

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
          id: "settle",
          label: "Settle",
          settle: "people",
          title: `Settle ${name}`,
          notice: `Pay back the entries ${name} covered, from an account you already have.`,
          defaults: {},
        },
        {
          id: "owe-more",
          label: "They paid for me",
          title: `${name} paid for something`,
          notice: `This is an entry ${name} covered for you. Pick what it was for. It counts as your spending, and it is one of the entries you settle later from your own account.`,
          lock: { type: true, source: true },
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
          notice: `The cash lands in ${bankName}, an account you already have. What you owe ${name} goes up, and that entry is what you settle later.`,
          lock: { type: true, source: true, destinationTypes: LIQUID },
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
          id: "settle",
          label: "Settle",
          settle: "people",
          title: `Settle ${name}`,
          notice: `Record them paying back the entries you funded, into an account you already have.`,
          defaults: {},
        },
        {
          id: "lend",
          label: "I paid for them",
          title: `Paid for ${name}`,
          notice: `The money leaves ${bankName}, an account you already have. ${name} owes you that amount. This is not recorded as your own spending.`,
          lock: { type: true, destination: true, sourceTypes: LIQUID },
          defaults: {
            type: "transfer",
            source_container_id: bankId,
            destination_container_id: account.id,
            description: `Paid for ${name}`,
          },
        },
      ];
    case "credit_card":
      return [
        {
          id: "pay-bill",
          label: "Pay bill",
          settle: "card",
          title: `Pay ${name} bill`,
          notice: `Moves money from ${bankName} and lowers the amount due. The purchases were already recorded when you used the card.`,
          defaults: {},
        },
        {
          id: "card-spend",
          label: "Card purchase",
          title: `Spent on ${name}`,
          notice: `This is spending on the card. Your bank is not charged yet, and the amount due goes up. Paying the bill later is a separate payment, not another expense.`,
          lock: { type: true, source: true },
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
