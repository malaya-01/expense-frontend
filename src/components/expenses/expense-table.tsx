"use client";

import Link from "next/link";
import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatRelativeDay } from "@/lib/format";
import type { LedgerTransaction } from "@/types";

const TYPE_TONE = {
  expense: "orange" as const,
  income: "green" as const,
  transfer: "blue" as const,
};

export function TransactionTable({
  transactions,
  onDelete,
  baseCurrency = "USD",
}: {
  transactions: LedgerTransaction[];
  onDelete: (id: string) => void;
  baseCurrency?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-[12px] bg-[var(--ds-background-elevated)] ds-border">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="text-xs text-[var(--ds-gray-900)]">
            <th className="px-6 py-3 font-normal">Transaction</th>
            <th className="px-6 py-3 font-normal">Flow</th>
            <th className="px-6 py-3 font-normal">Date</th>
            <th className="px-6 py-3 font-normal text-right">Amount</th>
            <th className="px-6 py-3 font-normal text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const nativeCurrency = tx.currency || "USD";
            const baseAmount = Number(tx.amount_base ?? tx.amount);
            const showBase =
              nativeCurrency.toUpperCase() !== baseCurrency.toUpperCase();
            const flow =
              tx.type === "transfer"
                ? `${tx.source_name || "—"}${tx.source_currency ? ` (${tx.source_currency})` : ""} → ${tx.destination_name || "—"}${tx.destination_currency ? ` (${tx.destination_currency})` : ""}`
                : tx.type === "expense"
                  ? `From ${tx.source_name || "—"}${tx.source_currency ? ` · ${tx.source_currency}` : ""}`
                  : `To ${tx.destination_name || "—"}${tx.destination_currency ? ` · ${tx.destination_currency}` : ""}`;
            const sign =
              tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
            return (
              <tr
                key={tx.id}
                className="hover:bg-[var(--ds-background-100)]"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <StatusDot tone={TYPE_TONE[tx.type]} />
                    <div>
                      <div className="text-sm text-[var(--ds-gray-1000)]">
                        {tx.description}
                      </div>
                      <div className="mt-0.5 text-xs capitalize text-[var(--ds-gray-700)]">
                        {tx.type}
                        {tx.category_name ? ` · ${tx.category_name}` : ""}
                        {tx.merchant ? ` · ${tx.merchant}` : ""}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--ds-gray-900)]">
                  {flow}
                </td>
                <td className="px-6 py-4 text-sm text-[var(--ds-gray-900)]">
                  {formatRelativeDay(tx.date)}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium tabular-nums text-[var(--ds-gray-1000)]">
                  <div>
                    {sign}
                    {formatCurrency(tx.amount, nativeCurrency)}
                  </div>
                  {showBase ? (
                    <div className="mt-0.5 text-xs font-normal text-[var(--ds-gray-700)]">
                      ≈ {sign}
                      {formatCurrency(baseAmount, baseCurrency)}
                    </div>
                  ) : null}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Link
                      href={`/expenses/${tx.id}`}
                      className="rounded-[6px] px-2.5 py-1.5 text-sm text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]"
                    >
                      Edit
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(tx.id)}
                      className="text-[var(--ds-status-red)]"
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
