"use client";

import { MoreHorizontal } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { StatusDot } from "@/components/ui/status-dot";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import type { LedgerTransaction } from "@/types";
import { SyncBadge } from "@/components/sync/sync-badge";

const TYPE_TONE = {
  expense: "orange" as const,
  income: "green" as const,
  transfer: "blue" as const,
};

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  baseCurrency = "USD",
}: {
  transactions: LedgerTransaction[];
  onEdit?: (transaction: LedgerTransaction) => void;
  onDelete?: (id: string) => void;
  baseCurrency?: string;
}) {
  function menuItems(tx: LedgerTransaction) {
    const items: {
      id: string;
      label: string;
      onSelect: () => void;
      tone?: "default" | "danger";
    }[] = [];
    if (onEdit) {
      items.push({ id: "edit", label: "Edit", onSelect: () => onEdit(tx) });
    }
    if (onDelete) {
      items.push({
        id: "delete",
        label: "Delete",
        tone: "danger",
        onSelect: () => onDelete(tx.id),
      });
    }
    return items;
  }

  return (
    <>
      <div className="space-y-1.5 md:hidden">
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
          const items = menuItems(tx);
          return (
            <article
              key={tx.id}
              className="rounded-[12px] bg-[var(--ds-background-elevated)] px-3 py-2.5 ds-border"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <StatusDot
                    tone={TYPE_TONE[tx.type]}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate text-[13px] font-medium">{tx.description}</h2>
                      <SyncBadge row={tx as any} />
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-[var(--ds-gray-700)]">
                      {flow}
                      {" · "}
                      {formatRelativeDate(tx.date)}
                      {tx.category_name ? ` · ${tx.category_name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <div className="text-right">
                    <p className="text-[13px] font-semibold tabular-nums">
                      {sign}
                      {formatCurrency(tx.amount, nativeCurrency)}
                    </p>
                    {showBase ? (
                      <p className="text-[9px] text-[var(--ds-gray-700)]">
                        ≈ {sign}
                        {formatCurrency(baseAmount, baseCurrency)}
                      </p>
                    ) : null}
                  </div>
                  {items.length ? (
                    <ActionMenu
                      label={`Actions for ${tx.description}`}
                      items={items}
                      trigger={
                        <span className="inline-flex size-7 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)]">
                          <MoreHorizontal size={15} />
                        </span>
                      }
                    />
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-hidden rounded-[16px] bg-[var(--ds-background-elevated)] ds-border md:block">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] bg-[var(--ds-background-100)] text-[11px] uppercase tracking-[0.08em] text-[var(--ds-gray-700)]">
            <th className="px-5 py-3 font-medium">Transaction</th>
            <th className="px-5 py-3 font-medium">Flow</th>
            <th className="px-5 py-3 font-medium">Date</th>
            <th className="px-5 py-3 font-medium text-right">Amount</th>
            <th className="px-5 py-3 font-medium text-right">Actions</th>
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
                className="border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_6%,transparent)] last:border-b-0 hover:bg-[color-mix(in_srgb,var(--ds-focus-color)_4%,transparent)]"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <StatusDot tone={TYPE_TONE[tx.type]} />
                    <div>
                      <div className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--ds-gray-1000)]">
                        {tx.description}
                        <SyncBadge row={tx as any} />
                      </div>
                      <div className="mt-0.5 text-[11px] capitalize text-[var(--ds-gray-700)]">
                        {tx.type}
                        {tx.category_name ? ` · ${tx.category_name}` : ""}
                        {tx.merchant ? ` · ${tx.merchant}` : ""}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-[12px] text-[var(--ds-gray-900)]">
                  {flow}
                </td>
                <td className="px-5 py-3.5 font-mono text-[12px] tabular-nums text-[var(--ds-gray-900)]">
                  {formatRelativeDate(tx.date)}
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-[13px] font-semibold tabular-nums text-[var(--ds-gray-1000)]">
                  <div>
                    {sign}
                    {formatCurrency(tx.amount, nativeCurrency)}
                  </div>
                  {showBase ? (
                    <div className="mt-0.5 text-[11px] font-normal text-[var(--ds-gray-700)]">
                      ≈ {sign}
                      {formatCurrency(baseAmount, baseCurrency)}
                    </div>
                  ) : null}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="inline-flex justify-end">
                    {menuItems(tx).length ? (
                      <ActionMenu
                        label={`Actions for ${tx.description}`}
                        items={menuItems(tx)}
                        trigger={
                          <span className="inline-flex size-8 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)]">
                            <MoreHorizontal size={16} />
                          </span>
                        }
                      />
                    ) : (
                      <span className="text-[11px] text-[var(--ds-gray-700)]">—</span>
                    )}
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
