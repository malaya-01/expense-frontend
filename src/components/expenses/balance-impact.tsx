"use client";

import { ArrowRight } from "lucide-react";
import {
  balanceDelta,
  balanceProblem,
  transactionLegs,
  type BalanceTx,
} from "@/lib/accounts/balance-effects";
import { isLiabilityType } from "@/lib/accounts/types-meta";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import type { FinancialContainer } from "@/types";

function balanceLabel(account: FinancialContainer) {
  if (account.type === "receivable") return `${account.name} owes you`;
  if (account.type === "credit_card") return `Due on ${account.name}`;
  if (isLiabilityType(account.type)) return `You owe ${account.name}`;
  return account.name;
}

/**
 * "What saving this does": every touched account's balance before → after,
 * worded for owed-money accounts ("You owe Ravi ₹2,000 → ₹1,500").
 */
export function BalanceImpact({
  tx,
  accounts,
  replacing,
}: {
  tx: BalanceTx;
  accounts: FinancialContainer[];
  /** Saved version of an edited transaction; its effect is undone first. */
  replacing?: BalanceTx | null;
}) {
  if (!(Number(tx.amount) > 0)) return null;
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const after = new Map<string, number>();
  const base = (id: string) => after.get(id) ?? Number(byId.get(id)?.balance) ?? 0;
  const apply = (t: BalanceTx, sign: 1 | -1) => {
    for (const leg of transactionLegs(t)) {
      const account = byId.get(leg.containerId);
      if (!account) continue;
      after.set(
        account.id,
        base(account.id) + sign * balanceDelta(account.type, leg.flow),
      );
    }
  };
  if (replacing) apply(replacing, -1);
  const start = new Map(after);
  apply(tx, 1);

  const rows = transactionLegs(tx)
    .map((leg) => byId.get(leg.containerId))
    .filter((a): a is FinancialContainer => Boolean(a));
  if (!rows.length) return null;
  const problem = balanceProblem(tx, accounts, replacing);

  return (
    <div
      className={cn(
        "rounded-[14px] px-3.5 py-2.5",
        problem
          ? "bg-[color-mix(in_srgb,var(--ds-status-red)_10%,transparent)]"
          : "bg-[var(--ds-gray-100)]",
      )}
      aria-live="polite"
    >
      <p className="text-[11px] font-medium text-[var(--ds-gray-700)]">
        After you save
      </p>
      <ul className="mt-1 space-y-1">
        {rows.map((account) => {
          const before = start.get(account.id) ?? Number(account.balance) ?? 0;
          const next = after.get(account.id) ?? before;
          const up = next > before;
          return (
            <li
              key={account.id}
              className="flex min-w-0 items-center justify-between gap-2 text-[12.5px]"
            >
              <span className="min-w-0 truncate text-[var(--ds-gray-1000)]">
                {balanceLabel(account)}
              </span>
              <span className="flex shrink-0 items-center gap-1 tabular-nums">
                <span className="text-[var(--ds-gray-700)]">
                  {formatCurrency(before, account.currency)}
                </span>
                <ArrowRight size={12} className="text-[var(--ds-gray-700)]" aria-hidden />
                <span
                  className={cn(
                    "font-semibold",
                    next < -0.005
                      ? "text-[var(--ds-status-red)]"
                      : isLiabilityType(account.type)
                        ? up
                          ? "text-[var(--ds-status-red)]"
                          : "text-[var(--ds-status-green)]"
                        : up
                          ? "text-[var(--ds-status-green)]"
                          : "text-[var(--ds-gray-1000)]",
                  )}
                >
                  {formatCurrency(next, account.currency)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {problem ? (
        <p className="mt-1.5 text-[12px] font-medium text-[var(--ds-status-red)]">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
