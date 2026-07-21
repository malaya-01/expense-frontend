"use client";

import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Progress } from "@/components/ui/feedback";
import { formatCurrency, formatDate } from "@/lib/format";
import { goalTypeLabel } from "@/lib/goals/meta";
import type { Goal } from "@/types";

const STATUS_LABEL = {
  on_track: "On track",
  behind: "Behind",
  achieved: "Achieved",
  at_risk: "At risk",
} as const;

const STATUS_TONE = {
  on_track: "green" as const,
  behind: "orange" as const,
  achieved: "teal" as const,
  at_risk: "red" as const,
};

export function GoalCard({
  goal,
  onEdit,
  onDelete,
  onContribute,
}: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onContribute: () => void;
}) {
  const pct = Math.min(100, Math.max(0, goal.percent));
  const barColor =
    goal.status === "achieved"
      ? "var(--ds-status-teal)"
      : goal.status === "at_risk"
        ? "var(--ds-status-red)"
        : goal.status === "behind"
          ? "var(--ds-status-orange)"
          : "var(--ds-status-green)";

  return (
    <Card>
      <CardBody className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[var(--ds-gray-1000)]">{goal.name}</h2>
            <p className="mt-0.5 text-xs text-[var(--ds-gray-700)]">
              {goalTypeLabel(goal.goal_type)}
              {goal.container_name ? ` · ${goal.container_name}` : ""}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-[var(--ds-gray-900)]">
            <StatusDot tone={STATUS_TONE[goal.status]} />
            {STATUS_LABEL[goal.status]}
          </span>
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] text-[var(--ds-gray-700)]">Saved</p>
            <p className="text-[22px] font-semibold leading-7 tracking-[-0.88px] tabular-nums text-[var(--ds-gray-1000)]">
              {formatCurrency(goal.current_amount, goal.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[var(--ds-gray-700)]">Target</p>
            <p className="text-sm tabular-nums text-[var(--ds-gray-900)]">
              {formatCurrency(goal.target_amount, goal.currency)}
            </p>
          </div>
        </div>

        <Progress className="mt-3" value={pct} tone={barColor} />

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

        <div className="mt-4 flex flex-wrap gap-1">
          {goal.progress_source === "manual" && goal.status !== "achieved" ? (
            <Button variant="secondary" size="sm" onClick={onContribute}>
              Contribute
            </Button>
          ) : null}
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
