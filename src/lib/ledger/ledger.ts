import {
  balanceDelta,
  transactionLegs,
} from "@/lib/accounts/balance-effects";
import { isLiabilityType } from "@/lib/accounts/types-meta";
import { compareTransactionTime } from "@/lib/transactions/order";
import type { FinancialContainer, LedgerTransaction } from "@/types";

/**
 * Ledgers are derived on the device from the stored transactions and the
 * current balances (which include unsynced entries), so they work offline and
 * always add up to what the Accounts page shows. Running balances are worked
 * backwards from today's balance: closing = now − later entries, opening =
 * closing − entries in the period.
 */

export type LedgerPeriod = { from: string | null; to: string | null };

export type AccountLedgerEntry = {
  tx: LedgerTransaction;
  /** Change to the stored balance (for liabilities: change in amount owed). */
  change: number;
  /** Balance right after this entry. */
  balanceAfter: number;
  /** The other side of the entry, in words. */
  counterparty: string;
};

export type AccountLedger = {
  account: FinancialContainer;
  opening: number;
  closing: number;
  /** Sum of increases / decreases of the stored balance in the period. */
  increases: number;
  decreases: number;
  entries: AccountLedgerEntry[];
};

const inPeriod = (date: string, period: LedgerPeriod) =>
  (!period.from || date >= period.from) && (!period.to || date <= period.to);
const afterPeriod = (date: string, period: LedgerPeriod) =>
  Boolean(period.to && date > period.to);

function changeFor(tx: LedgerTransaction, account: FinancialContainer): number {
  let change = 0;
  for (const leg of transactionLegs(tx)) {
    if (leg.containerId === account.id) {
      change += balanceDelta(account.type, leg.flow);
    }
  }
  return change;
}

function counterpartyFor(
  tx: LedgerTransaction,
  account: FinancialContainer,
): string {
  if (tx.type === "transfer") {
    return tx.source_container_id === account.id
      ? `to ${tx.destination_name || "another account"}`
      : `from ${tx.source_name || "another account"}`;
  }
  return tx.category_name || tx.merchant || (tx.type === "income" ? "Income" : "Expense");
}

const live = (tx: LedgerTransaction) =>
  !(tx as { deleted_at?: string | null }).deleted_at;

export function buildAccountLedger(
  account: FinancialContainer,
  transactions: LedgerTransaction[],
  period: LedgerPeriod,
): AccountLedger {
  const touching = transactions
    .filter(live)
    .filter(
      (tx) =>
        tx.source_container_id === account.id ||
        tx.destination_container_id === account.id,
    )
    .sort(compareTransactionTime);

  const later = touching
    .filter((tx) => afterPeriod(tx.date, period))
    .reduce((sum, tx) => sum + changeFor(tx, account), 0);
  const closing = Number(account.balance) - later;

  const within = touching.filter((tx) => inPeriod(tx.date, period));
  const total = within.reduce((sum, tx) => sum + changeFor(tx, account), 0);
  const opening = closing - total;

  let running = opening;
  let increases = 0;
  let decreases = 0;
  const entries = within.map((tx) => {
    const change = changeFor(tx, account);
    running += change;
    if (change >= 0) increases += change;
    else decreases += -change;
    return {
      tx,
      change,
      balanceAfter: running,
      counterparty: counterpartyFor(tx, account),
    };
  });

  return { account, opening, closing, increases, decreases, entries };
}

export type ConsolidatedEntry = {
  tx: LedgerTransaction;
  /** Effect on net worth in the base currency (transfers move money, not worth). */
  worthChange: number;
  worthAfter: number;
};

export type ConsolidatedLedger = {
  openingWorth: number;
  closingWorth: number;
  moneyIn: number;
  moneyOut: number;
  moved: number;
  entries: ConsolidatedEntry[];
  accounts: AccountLedger[];
};

function worthChange(tx: LedgerTransaction): number {
  const base = Number(tx.amount_base ?? tx.amount) || 0;
  if (tx.type === "income") return base;
  if (tx.type === "expense") return -base;
  return 0;
}

export function buildConsolidatedLedger(
  accounts: FinancialContainer[],
  transactions: LedgerTransaction[],
  period: LedgerPeriod,
  netWorthNow: number,
): ConsolidatedLedger {
  const all = transactions.filter(live).sort(compareTransactionTime);
  const later = all
    .filter((tx) => afterPeriod(tx.date, period))
    .reduce((sum, tx) => sum + worthChange(tx), 0);
  const closingWorth = netWorthNow - later;
  const within = all.filter((tx) => inPeriod(tx.date, period));
  const openingWorth =
    closingWorth - within.reduce((sum, tx) => sum + worthChange(tx), 0);

  let running = openingWorth;
  let moneyIn = 0;
  let moneyOut = 0;
  let moved = 0;
  const entries = within.map((tx) => {
    const change = worthChange(tx);
    running += change;
    if (tx.type === "income") moneyIn += change;
    else if (tx.type === "expense") moneyOut += -change;
    else moved += Number(tx.amount_base ?? tx.amount) || 0;
    return { tx, worthChange: change, worthAfter: running };
  });

  return {
    openingWorth,
    closingWorth,
    moneyIn,
    moneyOut,
    moved,
    entries,
    accounts: accounts.map((account) =>
      buildAccountLedger(account, transactions, period),
    ),
  };
}

/** Plain words for an account's balance column. */
export function balanceWording(account: FinancialContainer) {
  if (account.type === "receivable") {
    return { balance: "Owed to you", up: "Lent / owed more", down: "Paid back to you" };
  }
  if (account.type === "credit_card") {
    return { balance: "Amount due", up: "Card spending", down: "Bill paid" };
  }
  if (isLiabilityType(account.type)) {
    return { balance: "You owe", up: "Borrowed / owed more", down: "Paid back" };
  }
  return { balance: "Balance", up: "Money in", down: "Money out" };
}
