"use client";

import { MoreHorizontal, Target } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate } from "@/lib/format";
import { goalTypeLabel } from "@/lib/goals/meta";
import type { Goal } from "@/types";

const STATUS_LABEL = {
  on_track: "On Track",
  behind: "Behind",
  achieved: "Achieved",
  at_risk: "At Risk",
} as const;

const STATUS_CLASS = {
  on_track:
    "bg-[color-mix(in_srgb,var(--ds-status-green)_12%,transparent)] text-[var(--ds-status-green)]",
  behind:
    "bg-[color-mix(in_srgb,var(--ds-status-orange)_14%,transparent)] text-[var(--ds-status-orange)]",
  achieved:
    "bg-[color-mix(in_srgb,var(--ds-status-teal)_12%,transparent)] text-[var(--ds-status-teal)]",
  at_risk:
    "bg-[color-mix(in_srgb,var(--ds-status-red)_12%,transparent)] text-[var(--ds-status-red)]",
} as const;

export function GoalCard({
  goal,
  onEdit,
  onDelete,
  onContribute,
}: {
  goal: Goal;
  onEdit?: () => void;
  onDelete?: () => void;
  onContribute?: () => void;
}) {
  const pct = Math.min(100, Math.max(0, goal.percent));
  const accent =
    goal.status === "achieved"
      ? "var(--ds-status-teal)"
      : goal.status === "at_risk"
        ? "var(--ds-status-red)"
        : goal.status === "behind"
          ? "var(--ds-status-orange)"
          : "#0D9488";

  return (
    <article className="relative min-w-0 overflow-hidden rounded-[12px] bg-[var(--ds-background-elevated)] ds-border sm:rounded-[16px]">
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="p-3 pl-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-3">
            <span
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] sm:size-10 sm:rounded-[12px]"
              style={{
                color: accent,
                background: `color-mix(in srgb, ${accent} 14%, transparent)`,
              }}
            >
              <Target size={17} strokeWidth={1.85} />
            </span>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h2 className="truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
                {goal.name}
              </h2>
              <p className="mt-0.5 truncate text-xs text-[var(--ds-gray-700)]">
                {goalTypeLabel(goal.goal_type)}
                {goal.container_name ? ` · ${goal.container_name}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={cn(
                "max-w-[4.5rem] truncate rounded-full px-1.5 py-0.5 text-[9px] font-medium sm:max-w-none sm:px-2 sm:text-[10px]",
                STATUS_CLASS[goal.status],
              )}
            >
              {STATUS_LABEL[goal.status]}
            </span>
            <ActionMenu
              label={`Actions for ${goal.name}`}
              items={[
                ...(goal.progress_source === "manual" &&
                goal.status !== "achieved" &&
                onContribute
                  ? [
                      {
                        id: "contribute",
                        label: "Contribute",
                        onSelect: onContribute,
                      },
                    ]
                  : []),
                ...(onEdit
                  ? [{ id: "edit", label: "Edit", onSelect: onEdit }]
                  : []),
                ...(onDelete
                  ? [
                      {
                        id: "delete",
                        label: "Delete",
                        tone: "danger" as const,
                        onSelect: onDelete,
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
              Saved
            </p>
            <p className="mt-1 text-[18px] font-semibold leading-6 sm:text-[22px] sm:leading-7 tracking-[-0.88px] tabular-nums text-[var(--ds-gray-1000)]">
              {formatCurrency(goal.current_amount, goal.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
              Target
            </p>
            <p className="mt-1 text-sm tabular-nums text-[var(--ds-gray-900)]">
              {formatCurrency(goal.target_amount, goal.currency)}
            </p>
          </div>
        </div>

        <Progress className="mt-3" value={pct} tone={accent} />

        <div className="mt-2 flex items-center justify-between text-xs text-[var(--ds-gray-700)]">
          <span>
            {goal.status === "achieved"
              ? "Target reached"
              : `${formatCurrency(goal.remaining, goal.currency)} to go`}
          </span>
          <span className="tabular-nums">{goal.percent.toFixed(0)}%</span>
        </div>

        <div className="mt-3 space-y-1 text-[11px] text-[var(--ds-gray-700)]">
          {goal.target_date ? (
            <p>Target date: {formatDate(goal.target_date)}</p>
          ) : null}
          {goal.predicted_date && goal.status !== "achieved" ? (
            <p>Predicted: {formatDate(goal.predicted_date)}</p>
          ) : null}
          {goal.progress_source === "container" ? (
            <p>Tracks linked account balance</p>
          ) : null}
        </div>

        {goal.progress_source === "manual" &&
        goal.status !== "achieved" &&
        onContribute ? (
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={onContribute}>
              Contribute
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
