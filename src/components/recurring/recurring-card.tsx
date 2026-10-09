"use client";

import {
  CalendarClock,
  ListChecks,
  MoreHorizontal,
  Pause,
  Play,
  Zap,
} from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate } from "@/lib/format";
import { recurringDueInfo } from "@/lib/recurring/schedule";
import { transactionAmountClass } from "@/lib/transactions/display";
import type { RecurringSchedule } from "@/types";

const FREQUENCY_LABEL: Record<RecurringSchedule["frequency"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Every 6 months",
  annual: "Yearly",
};

export function RecurringCard({
  schedule,
  currency,
  busy,
  onPost,
  onPostAll,
  onSkipMissed,
  onEdit,
  onPause,
  onResume,
  onArchive,
}: {
  schedule: RecurringSchedule;
  currency: string;
  /** A post / skip for this schedule is in flight. */
  busy?: boolean;
  onPost?: () => void | Promise<void>;
  onPostAll?: (count: number) => void | Promise<void>;
  onSkipMissed?: () => void | Promise<void>;
  onEdit?: () => void;
  onPause?: () => void | Promise<void>;
  onResume?: () => void | Promise<void>;
  onArchive?: () => void;
}) {
  const { dueCount, missedCount, skipTo } = recurringDueInfo(schedule);
  const due = dueCount > 0;
  const accent = due ? "var(--ds-status-orange)" : "var(--ds-status-blue)";
  const flow =
    schedule.transaction_type === "income"
      ? schedule.destination_name || "—"
      : schedule.transaction_type === "transfer"
        ? `${schedule.source_name || "—"} → ${schedule.destination_name || "—"}`
        : schedule.source_name || "—";
  const sign =
    schedule.transaction_type === "income"
      ? "+"
      : schedule.transaction_type === "expense"
        ? "−"
        : "";

  const menuItems = [
    ...(onEdit && schedule.status !== "archived"
      ? [{ id: "edit", label: "Edit", onSelect: onEdit }]
      : []),
    ...(dueCount > 1 && onPostAll
      ? [
          {
            id: "post-all",
            label: `Post all ${dueCount} due`,
            onSelect: () => void onPostAll(dueCount),
            disabled: busy,
          },
        ]
      : []),
    ...(missedCount > 0 && onSkipMissed
      ? [
          {
            id: "skip",
            label: `Skip ${missedCount} missed (next ${formatDate(skipTo)})`,
            onSelect: () => void onSkipMissed(),
            disabled: busy,
          },
        ]
      : []),
    ...(schedule.status === "active" && onPause
      ? [{ id: "pause", label: "Pause", onSelect: () => void onPause() }]
      : schedule.status === "paused" && onResume
        ? [{ id: "resume", label: "Resume", onSelect: () => void onResume() }]
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
  ];

  return (
    <article className="relative min-w-0 overflow-hidden rounded-[14px] bg-[var(--ds-background-elevated)] ds-border sm:rounded-[16px]">
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="p-3.5 pl-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] sm:size-10 sm:rounded-[12px]"
            style={{
              color: accent,
              background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            }}
            aria-hidden
          >
            <CalendarClock size={17} strokeWidth={1.85} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[14px] font-semibold leading-5 text-[var(--ds-gray-1000)]">
              {schedule.name}
            </h2>
            <p className="mt-0.5 truncate text-[12px] leading-4 text-[var(--ds-gray-700)]">
              {flow}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Badge
              tone={
                due
                  ? "warning"
                  : schedule.status === "active"
                    ? "success"
                    : schedule.status === "paused"
                      ? "warning"
                      : "neutral"
              }
            >
              {due ? (dueCount > 1 ? `${dueCount} due` : "due") : schedule.status}
            </Badge>
            {menuItems.length ? (
              <ActionMenu
                label={`Actions for ${schedule.name}`}
                items={menuItems}
                trigger={
                  <span className="inline-flex size-8 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)]">
                    <MoreHorizontal size={16} />
                  </span>
                }
              />
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "truncate text-[19px] font-semibold leading-6 tabular-nums sm:text-xl",
                transactionAmountClass(schedule.transaction_type),
              )}
            >
              {sign}
              {formatCurrency(schedule.amount, schedule.currency || currency)}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--ds-gray-700)]">
              {FREQUENCY_LABEL[schedule.frequency] ?? schedule.frequency} ·{" "}
              <span className="capitalize">{schedule.transaction_type}</span>
              {schedule.execution_mode === "automatic" ? " · Auto" : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
              {due ? "Due" : "Next"}
            </p>
            <p
              className={cn(
                "mt-0.5 text-[12px] font-medium",
                due
                  ? "text-[var(--ds-status-orange)]"
                  : "text-[var(--ds-gray-1000)]",
              )}
            >
              {formatDate(schedule.next_execution)}
            </p>
          </div>
        </div>

        {dueCount > 1 ? (
          <p className="mt-2.5 rounded-[8px] bg-[color-mix(in_srgb,var(--ds-status-orange)_10%,transparent)] px-2.5 py-1.5 text-[11px] leading-4 text-[var(--ds-gray-900)]">
            {dueCount} runs waiting since {formatDate(schedule.next_execution)}.
            {missedCount > 0 ? " Not paying for those? Skip them from ⋯." : ""}
          </p>
        ) : null}

        {schedule.last_error ? (
          <p className="mt-2.5 rounded-[8px] bg-[var(--ds-danger-hover)] px-2.5 py-1.5 text-[11px] leading-4 text-[var(--ds-status-red)]">
            {schedule.last_error}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {due && onPost ? (
            <Button size="sm" onClick={onPost} disabled={busy}>
              <Zap size={13} />
              {dueCount > 1 ? `Post ${formatDate(schedule.next_execution)}` : "Post now"}
            </Button>
          ) : null}
          {dueCount > 1 && onPostAll ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onPostAll(dueCount)}
              disabled={busy}
            >
              <ListChecks size={13} />
              Post all {dueCount}
            </Button>
          ) : null}
          {!due && schedule.status === "active" && onPause ? (
            <Button size="sm" variant="secondary" onClick={onPause}>
              <Pause size={13} />
              Pause
            </Button>
          ) : schedule.status === "paused" && onResume ? (
            <Button size="sm" variant="secondary" onClick={onResume}>
              <Play size={13} />
              Resume
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
