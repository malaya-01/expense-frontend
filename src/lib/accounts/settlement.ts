import { balanceDelta, transactionLegs } from "@/lib/accounts/balance-effects";
import { isLiquidType } from "@/lib/accounts/types-meta";
import type { FinancialContainer, LedgerTransaction } from "@/types";

/** Hidden note line that remembers which open entries a settlement paid. */
export const SETTLEMENT_MARKER = "@@opal-settles:";

export type SettlementSlice = { id: string; amount: number };

export type OpenEntry = {
  id: string;
  date: string;
  description: string;
  /** How much this entry added. */
  original: number;
  /** Still unpaid. */
  remaining: number;
  /** The balance the account was created with, which has no transaction. */
  opening?: boolean;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function splitSettlementNote(notes: string | null | undefined): {
  text: string;
  slices: SettlementSlice[];
} {
  if (!notes) return { text: "", slices: [] };
  const slices: SettlementSlice[] = [];
  const kept: string[] = [];
  for (const line of notes.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(SETTLEMENT_MARKER)) {
      kept.push(line);
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed.slice(SETTLEMENT_MARKER.length));
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        if (
          item &&
          typeof item.id === "string" &&
          Number(item.amount) > 0
        ) {
          slices.push({ id: item.id, amount: round2(Number(item.amount)) });
        }
      }
    } catch {
      /* a broken marker is ignored; the payment still counts via FIFO */
    }
  }
  return { text: kept.join("\n").trim(), slices };
}

export function joinSettlementNote(
  text: string,
  slices: SettlementSlice[],
): string {
  const body = text.trim();
  if (!slices.length) return body;
  const marker = `${SETTLEMENT_MARKER}${JSON.stringify(
    slices.map((slice) => ({ id: slice.id, amount: round2(slice.amount) })),
  )}`;
  return body ? `${body}\n${marker}` : marker;
}

/** Notes safe to show. The settlement marker stays out of the form. */
export function visibleNotes(notes: string | null | undefined): string {
  return splitSettlementNote(notes).text;
}

/** Change in the stored balance. Positive means more is still outstanding. */
export function balanceEffect(
  tx: LedgerTransaction,
  account: FinancialContainer,
): number {
  let effect = 0;
  for (const leg of transactionLegs(tx)) {
    if (leg.containerId !== account.id) continue;
    effect += balanceDelta(account.type, leg.flow);
  }
  return round2(effect);
}

function openingId(accountId: string) {
  return `opening:${accountId}`;
}

/**
 * Payable / receivable entries that are not paid off yet.
 *
 * A payable entry is something they covered for you (or cash you borrowed).
 * A receivable entry is something you paid for them from an account you have.
 * Settlements name the entries they close. Older payments that were not
 * named are applied to the oldest open entries, so history still lines up
 * with the balance.
 *
 * Credit cards are not listed here. A card bill pays down one balance.
 */
export function openEntries(
  account: FinancialContainer,
  transactions: LedgerTransaction[],
): OpenEntry[] {
  if (account.type !== "payable" && account.type !== "receivable") return [];

  const touching = transactions
    .filter((tx) => !(tx as { deleted_at?: string | null }).deleted_at)
    .map((tx) => ({ tx, effect: balanceEffect(tx, account) }))
    .filter((row) => Math.abs(row.effect) > 0.005);

  const principals = touching
    .filter((row) => row.effect > 0)
    .map((row) => ({
      id: row.tx.id,
      date: row.tx.date,
      description: row.tx.description,
      original: row.effect,
      remaining: row.effect,
      opening: false,
      created: row.tx.created_at || row.tx.date,
    }));

  const sumPrincipal = principals.reduce((sum, row) => sum + row.original, 0);
  const sumSettlement = touching
    .filter((row) => row.effect < 0)
    .reduce((sum, row) => sum + -row.effect, 0);
  const opening = round2(
    Number(account.balance) - sumPrincipal + sumSettlement,
  );

  const items = [];
  if (opening > 0.005) {
    items.push({
      id: openingId(account.id),
      date: (account.created_at || "").slice(0, 10),
      description: "Starting balance",
      original: opening,
      remaining: opening,
      opening: true,
      created: account.created_at || "",
    });
  }
  items.push(...principals);

  const byId = new Map(items.map((item) => [item.id, item]));
  const oldestFirst = [...items].sort(
    (a, b) =>
      (a.date || "").localeCompare(b.date || "") ||
      a.created.localeCompare(b.created),
  );

  const settlements = touching
    .filter((row) => row.effect < 0)
    .sort(
      (a, b) =>
        (a.tx.date || "").localeCompare(b.tx.date || "") ||
        (a.tx.created_at || "").localeCompare(b.tx.created_at || ""),
    );

  for (const row of settlements) {
    const pool = -row.effect;
    let used = 0;
    for (const slice of splitSettlementNote(row.tx.notes).slices) {
      const item = byId.get(slice.id);
      if (!item || item.remaining <= 0) continue;
      const take = Math.min(
        item.remaining,
        slice.amount,
        round2(pool - used),
      );
      if (take <= 0.005) continue;
      item.remaining = round2(item.remaining - take);
      used = round2(used + take);
    }
    let left = round2(pool - used);
    for (const item of oldestFirst) {
      if (left <= 0.005) break;
      if (item.remaining <= 0) continue;
      const take = Math.min(item.remaining, left);
      item.remaining = round2(item.remaining - take);
      left = round2(left - take);
    }
  }

  return oldestFirst
    .filter((item) => item.remaining > 0.005)
    .map(({ created: _created, ...item }) => item);
}

/** Apply a payment across entries in order. The last one can be partial. */
export function allocateAmount(
  entries: OpenEntry[],
  amount: number,
): SettlementSlice[] {
  let left = round2(amount);
  const slices: SettlementSlice[] = [];
  for (const entry of entries) {
    if (left <= 0.005) break;
    const take = round2(Math.min(entry.remaining, left));
    if (take <= 0) continue;
    slices.push({ id: entry.id, amount: take });
    left = round2(left - take);
  }
  return slices;
}

/** Bank, cash, or wallet in the same currency — an account the user already has. */
export function fundingAccounts(
  accounts: FinancialContainer[],
  account: FinancialContainer,
): FinancialContainer[] {
  return accounts
    .filter(
      (candidate) =>
        candidate.id !== account.id &&
        !candidate.space_id &&
        isLiquidType(candidate.type) &&
        candidate.currency === account.currency,
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}
