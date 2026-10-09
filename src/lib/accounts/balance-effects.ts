import { isLiabilityType } from "@/lib/accounts/types-meta";
import { formatCurrency } from "@/lib/format";
import { offlineDb } from "@/lib/offline/db";
import { invalidateHydrate, notifyDataUpdated } from "@/lib/offline/hydrate-cache";
import type { ContainerType, TransactionType } from "@/types";

/**
 * Client mirror of the backend posting rules (TransactionsService
 * applyEffects / adjustContainer), so account balances on this device move
 * the moment a transaction is saved — online or offline — and an offline
 * entry the server would reject is caught before it is queued.
 *
 * Balances of liability accounts (credit card, loan, payable) are the amount
 * OWED: money flowing out of them increases it, money paid in decreases it.
 */

export type BalanceTx = {
  type: TransactionType;
  amount: number;
  exchange_rate?: number | null;
  source_container_id?: string | null;
  destination_container_id?: string | null;
};

type ContainerLike = {
  id: string;
  name: string;
  type: ContainerType;
  balance: number;
  currency: string;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Money movement per account in that account's own currency, from the
 * account's point of view: negative = money left it, positive = money in.
 */
export function transactionLegs(
  tx: BalanceTx,
): Array<{ containerId: string; flow: number }> {
  const amount = Number(tx.amount) || 0;
  const legs: Array<{ containerId: string; flow: number }> = [];
  if (tx.type === "expense" && tx.source_container_id) {
    legs.push({ containerId: tx.source_container_id, flow: -amount });
  }
  if (tx.type === "income" && tx.destination_container_id) {
    legs.push({ containerId: tx.destination_container_id, flow: amount });
  }
  if (tx.type === "transfer") {
    if (tx.source_container_id) {
      legs.push({ containerId: tx.source_container_id, flow: -amount });
    }
    if (tx.destination_container_id) {
      const rate = Number(tx.exchange_rate) > 0 ? Number(tx.exchange_rate) : 1;
      legs.push({
        containerId: tx.destination_container_id,
        flow: round2(amount * rate),
      });
    }
  }
  return legs;
}

/** Change to the stored balance for a flow (liabilities store amount owed). */
export function balanceDelta(type: ContainerType, flow: number): number {
  return isLiabilityType(type) ? -flow : flow;
}

/**
 * Why the server would refuse this posting, or null. `replacing` is the
 * previous version of an edited transaction (its effect is undone first).
 */
export function balanceProblem(
  tx: BalanceTx,
  accounts: ContainerLike[],
  replacing?: BalanceTx | null,
): string | null {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const next = new Map<string, number>();
  const touch = (legs: ReturnType<typeof transactionLegs>, sign: 1 | -1) => {
    for (const leg of legs) {
      const account = byId.get(leg.containerId);
      if (!account) continue;
      const current = next.get(account.id) ?? (Number(account.balance) || 0);
      next.set(account.id, current + sign * balanceDelta(account.type, leg.flow));
    }
  };
  if (replacing) touch(transactionLegs(replacing), -1);
  touch(transactionLegs(tx), 1);

  for (const leg of transactionLegs(tx)) {
    const account = byId.get(leg.containerId);
    if (!account) continue;
    const after = next.get(account.id) ?? 0;
    if (after >= -0.005) continue;
    const before = after - balanceDelta(account.type, leg.flow);
    const have = formatCurrency(Math.max(0, before), account.currency);
    return isLiabilityType(account.type)
      ? `You only owe ${have} on ${account.name}. This payment is more than that.`
      : `${account.name} has only ${have}. This would take it below zero.`;
  }
  return null;
}

/** Same check against the balances stored on this device. */
export async function localBalanceProblem(
  tx: BalanceTx,
  replacing?: BalanceTx | null,
): Promise<string | null> {
  const ids = new Set(
    [...transactionLegs(tx), ...(replacing ? transactionLegs(replacing) : [])].map(
      (leg) => leg.containerId,
    ),
  );
  const rows = await offlineDb.accounts.bulkGet([...ids]);
  const accounts = rows.filter(Boolean) as unknown as ContainerLike[];
  return balanceProblem(tx, accounts, replacing);
}

/**
 * Apply (sign 1) or undo (sign -1) a transaction on the device's stored
 * balances. The next accounts refresh replaces them with the server's
 * numbers, which already include the same posting once it has synced.
 */
export async function applyLocalBalanceEffects(
  tx: BalanceTx,
  sign: 1 | -1,
): Promise<void> {
  const legs = transactionLegs(tx);
  if (!legs.length) return;
  await offlineDb.transaction("rw", offlineDb.accounts, async () => {
    for (const leg of legs) {
      const row = (await offlineDb.accounts.get(leg.containerId)) as
        | (ContainerLike & Record<string, unknown>)
        | undefined;
      if (!row) continue;
      const balance = round2(
        (Number(row.balance) || 0) + sign * balanceDelta(row.type, leg.flow),
      );
      await offlineDb.accounts.put({ ...row, balance } as never);
    }
  });
  invalidateHydrate("accounts");
  notifyDataUpdated();
}
