"use client";

import { MoreHorizontal, Wallet } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Progress } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Budget } from "@/types";

const STATUS_LABEL = {
  on_track: "On Track",
  warning: "Near Limit",
  over: "Over Budget",
} as const;

const STATUS_CLASS = {
  on_track:
    "bg-[color-mix(in_srgb,var(--ds-status-green)_12%,transparent)] text-[var(--ds-status-green)]",
  warning:
    "bg-[color-mix(in_srgb,var(--ds-status-orange)_14%,transparent)] text-[var(--ds-status-orange)]",
  over: "bg-[color-mix(in_srgb,var(--ds-status-red)_12%,transparent)] text-[var(--ds-status-red)]",
} as const;

export function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: Budget;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct = Math.min(100, Math.max(0, budget.percent));
  const accent = budget.category_color || "#2563EB";
  const barColor =
    budget.status === "over"
      ? "var(--ds-status-red)"
      : budget.status === "warning"
        ? "var(--ds-status-orange)"
        : "var(--ds-status-green)";

  return (
    <article className="relative overflow-hidden rounded-[16px] bg-[var(--ds-background-elevated)] ds-border">
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="p-4 pl-5 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px]"
              style={{
                color: accent,
                background: `color-mix(in srgb, ${accent} 14%, transparent)`,
              }}
            >
              <Wallet size={17} strokeWidth={1.85} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
                {budget.name}
              </h2>
              <p className="mt-0.5 truncate text-xs capitalize text-[var(--ds-gray-700)]">
                {budget.period_type}
                {budget.category_name
                  ? ` · ${budget.category_name}`
                  : " · All expenses"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                STATUS_CLASS[budget.status],
              )}
            >
              {STATUS_LABEL[budget.status]}
            </span>
            <ActionMenu
              label={`Actions for ${budget.name}`}
              items={[
                { id: "edit", label: "Edit", onSelect: onEdit },
                {
                  id: "delete",
                  label: "Delete",
                  tone: "danger",
                  onSelect: onDelete,
                },
              ]}
              trigger={
                <span className="inline-flex size-8 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)]">
                  <MoreHorizontal size={16} />
                </span>
              }
            />
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
              Spent
            </p>
            <p className="mt-1 text-[22px] font-semibold leading-7 tracking-[-0.88px] tabular-nums text-[var(--ds-gray-1000)]">
              {formatCurrency(budget.spent, budget.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
              Limit
            </p>
            <p className="mt-1 text-sm tabular-nums text-[var(--ds-gray-900)]">
              {formatCurrency(budget.amount, budget.currency)}
            </p>
          </div>
        </div>

        <Progress className="mt-3" value={pct} tone={barColor} />

        <div className="mt-2 flex items-center justify-between text-xs text-[var(--ds-gray-700)]">
          <span>
            {budget.remaining >= 0
              ? `${formatCurrency(budget.remaining, budget.currency)} left`
              : `${formatCurrency(Math.abs(budget.remaining), budget.currency)} over`}
          </span>
          <span className="tabular-nums">{budget.percent.toFixed(0)}%</span>
        </div>

        <p className="mt-3 text-[11px] text-[var(--ds-gray-700)]">
          {formatDate(budget.period_start)} – {formatDate(budget.period_end)}
        </p>
      </div>
    </article>
  );
}
