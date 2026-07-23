"use client";

import { CalendarClock, MoreHorizontal, Pause, Play, Zap } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import type { RecurringSchedule } from "@/types";

export function RecurringCard({
  schedule,
  currency,
  onPost,
  onPause,
  onResume,
  onArchive,
}: {
  schedule: RecurringSchedule;
  currency: string;
  onPost: () => void;
  onPause: () => void;
  onResume: () => void;
  onArchive: () => void;
}) {
  const due =
    schedule.status === "active" && schedule.next_execution <= todayISO();
  const accent = due ? "#FF990A" : "#2563EB";

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
              <CalendarClock size={17} strokeWidth={1.85} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
                {schedule.name}
              </h2>
              <p className="mt-0.5 truncate text-xs text-[var(--ds-gray-700)]">
                {schedule.source_name || "External"}
                {schedule.destination_name
                  ? ` → ${schedule.destination_name}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge
              tone={
                schedule.status === "active"
                  ? due
                    ? "warning"
                    : "success"
                  : schedule.status === "paused"
                    ? "warning"
                    : "neutral"
              }
            >
              {due ? "due" : schedule.status}
            </Badge>
            <ActionMenu
              label={`Actions for ${schedule.name}`}
              items={[
                ...(due
                  ? [{ id: "post", label: "Post now", onSelect: onPost }]
                  : []),
                ...(schedule.status === "active"
                  ? [{ id: "pause", label: "Pause", onSelect: onPause }]
                  : schedule.status === "paused"
                    ? [{ id: "resume", label: "Resume", onSelect: onResume }]
                    : []),
                {
                  id: "archive",
                  label: "Archive",
                  tone: "danger",
                  onSelect: onArchive,
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

        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-xl font-semibold tabular-nums text-[var(--ds-gray-1000)]">
              {formatCurrency(schedule.amount, schedule.currency || currency)}
            </p>
            <p className="mt-1 text-[11px] capitalize text-[var(--ds-gray-700)]">
              {schedule.frequency} · {schedule.transaction_type}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
              Next
            </p>
            <p className="mt-1 text-xs text-[var(--ds-gray-1000)]">
              {formatDate(schedule.next_execution)}
            </p>
          </div>
        </div>

        {schedule.last_error ? (
          <p className="mt-3 rounded-[8px] bg-[var(--ds-danger-hover)] p-2 text-[11px] leading-4 text-[var(--ds-status-red)]">
            {schedule.last_error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {due ? (
            <Button size="sm" onClick={onPost}>
              <Zap size={13} />
              Post now
            </Button>
          ) : null}
          {schedule.status === "active" ? (
            <Button size="sm" variant="secondary" onClick={onPause}>
              <Pause size={13} />
              Pause
            </Button>
          ) : schedule.status === "paused" ? (
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
