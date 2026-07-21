"use client";

import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Progress } from "@/components/ui/feedback";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Budget } from "@/types";

const STATUS_LABEL = {
  on_track: "On track",
  warning: "Near limit",
  over: "Over budget",
} as const;

const STATUS_TONE = {
  on_track: "green" as const,
  warning: "orange" as const,
  over: "red" as const,
};

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
  const barColor =
    budget.status === "over"
      ? "var(--ds-status-red)"
      : budget.status === "warning"
        ? "var(--ds-status-orange)"
        : "var(--ds-status-green)";

  return (
    <Card>
      <CardBody className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <StatusDot
                color={budget.category_color || undefined}
                tone={STATUS_TONE[budget.status]}
              />
              <h2 className="truncate text-[var(--ds-gray-1000)]">
                {budget.name}
              </h2>
            </div>
            <p className="mt-0.5 text-xs capitalize text-[var(--ds-gray-700)]">
              {budget.period_type}
              {budget.category_name
                ? ` · ${budget.category_name}`
                : " · All expenses"}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-[var(--ds-gray-900)]">
            <StatusDot tone={STATUS_TONE[budget.status]} />
            {STATUS_LABEL[budget.status]}
          </span>
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] text-[var(--ds-gray-700)]">Spent</p>
            <p className="text-[22px] font-semibold leading-7 tracking-[-0.88px] tabular-nums text-[var(--ds-gray-1000)]">
              {formatCurrency(budget.spent, budget.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[var(--ds-gray-700)]">of</p>
            <p className="text-sm tabular-nums text-[var(--ds-gray-900)]">
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

        <div className="mt-4 flex gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--ds-status-red)]"
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
