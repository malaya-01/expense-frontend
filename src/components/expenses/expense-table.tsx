"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
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
    <>
      <div className="space-y-2 md:hidden">
        {transactions.map((tx) => {
          const nativeCurrency = tx.currency || "USD";
          const baseAmount = Number(tx.amount_base ?? tx.amount);
          const showBase =
            nativeCurrency.toUpperCase() !== baseCurrency.toUpperCase();
          const sign =
            tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
          const flow =
            tx.type === "transfer"
              ? `${tx.source_name || "—"} → ${tx.destination_name || "—"}`
              : tx.type === "expense"
                ? `From ${tx.source_name || "—"}`
                : `To ${tx.destination_name || "—"}`;
          return (
            <article
              key={tx.id}
              className="rounded-[13px] bg-[var(--ds-background-elevated)] p-4 ds-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <StatusDot
                    tone={TYPE_TONE[tx.type]}
                    className="mt-1.5"
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-sm">{tx.description}</h2>
                    <p className="mt-1 text-[11px] capitalize text-[var(--ds-gray-700)]">
                      {tx.type}
                      {tx.category_name ? ` · ${tx.category_name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {sign}
                    {formatCurrency(tx.amount, nativeCurrency)}
                  </p>
                  {showBase ? (
                    <p className="mt-0.5 text-[10px] text-[var(--ds-gray-700)]">
                      ≈ {sign}
                      {formatCurrency(baseAmount, baseCurrency)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--ds-gray-200)] pt-3">
                <div>
                  <p className="text-[11px] text-[var(--ds-gray-900)]">{flow}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--ds-gray-700)]">
                    {formatRelativeDate(tx.date)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Link
                    href={`/expenses/${tx.id}`}
                    aria-label={`Edit ${tx.description}`}
                    className="flex size-9 items-center justify-center rounded-[8px] text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] ds-focus"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(tx.id)}
                    aria-label={`Delete ${tx.description}`}
                    className="flex size-9 items-center justify-center rounded-[8px] text-[var(--ds-status-red)] hover:bg-[var(--ds-danger-hover)] ds-focus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-[12px] bg-[var(--ds-background-elevated)] ds-border md:block">
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
                  {formatRelativeDate(tx.date)}
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
    </>
  );
}
