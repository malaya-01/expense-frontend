"use client";

import { CalendarDays, Landmark, MoreHorizontal } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { Badge, Progress } from "@/components/ui/feedback";
import { formatCurrency } from "@/lib/format";
import type { Loan } from "@/types";

export function LoanCard({
  loan,
  onPay,
  onSchedule,
  onEdit,
  onArchive,
}: {
  loan: Loan;
  onPay?: () => void;
  onSchedule?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
}) {
  const accent = "#F97316";

  return (
    <article className="relative overflow-hidden rounded-[12px] bg-[var(--ds-background-elevated)] ds-border sm:rounded-[16px]">
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="p-3 pl-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] sm:size-10 sm:rounded-[12px]"
              style={{
                color: accent,
                background: `color-mix(in srgb, ${accent} 14%, transparent)`,
              }}
            >
              <Landmark size={17} strokeWidth={1.85} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
                {loan.name}
              </h2>
              <p className="mt-0.5 truncate text-xs text-[var(--ds-gray-700)]">
                {loan.lender || loan.container_name}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge
              tone={
                loan.status === "active"
                  ? "success"
                  : loan.status === "closed"
                    ? "info"
                    : "neutral"
              }
            >
              {loan.status}
            </Badge>
            <ActionMenu
              label={`Actions for ${loan.name}`}
              items={[
                ...(loan.status === "active" && onPay
                  ? [{ id: "pay", label: "Record payment", onSelect: onPay }]
                  : []),
                ...(onSchedule
                  ? [
                      {
                        id: "schedule",
                        label: "View schedule",
                        onSelect: onSchedule,
                      },
                    ]
                  : []),
                ...(onEdit
                  ? [{ id: "edit", label: "Edit", onSelect: onEdit }]
                  : []),
                ...(onArchive
                  ? [
                      {
                        id: "archive",
                        label: "Archive",
                        tone: "danger" as const,
                        onSelect: onArchive,
                      },
                    ]
                  : []),
              ]}
              trigger={
                <span className="inline-flex size-8 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)]">
                  <MoreHorizontal size={16} />
                </span>
              }
            />
          </div>
        </div>

        <div className="mt-3 sm:mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
              Outstanding
            </p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.5px] tabular-nums text-[var(--ds-gray-1000)]">
              {formatCurrency(loan.outstanding_balance, loan.currency)}
            </p>
          </div>
          <div className="text-right text-[11px] text-[var(--ds-gray-700)]">
            <p>{loan.annual_interest_rate.toFixed(2)}% APR</p>
            <p className="mt-1">
              {formatCurrency(loan.monthly_payment, loan.currency)}/mo
            </p>
          </div>
        </div>

        <Progress
          className="mt-4"
          value={loan.payoff_percent}
          label="Paid off"
          tone="var(--ds-status-green)"
        />

        {loan.status === "active" || onSchedule ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {loan.status === "active" && onPay ? (
              <Button size="sm" onClick={onPay}>
                Record payment
              </Button>
            ) : null}
            {onSchedule ? (
              <Button size="sm" variant="secondary" onClick={onSchedule}>
                <CalendarDays size={13} />
                Schedule
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
