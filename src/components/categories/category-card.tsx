"use client";

import { ArrowLeftRight, CalendarDays, MoreHorizontal } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Progress } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { getCategoryIconComponent } from "@/lib/categories/icons";
import { formatCurrency, formatRelativeDay } from "@/lib/format";
import type { Category } from "@/types";

function periodLabel(period?: string | null) {
  switch ((period || "MONTHLY").toUpperCase()) {
    case "DAILY":
      return "day";
    case "WEEKLY":
      return "week";
    case "YEARLY":
      return "year";
    default:
      return "month";
  }
}

function budgetStatus(spent: number, budget?: number | null) {
  if (!budget || budget <= 0) {
    return {
      id: "none" as const,
      label: "No Budget",
      className: "bg-[var(--ds-gray-100)] text-[var(--ds-gray-900)]",
    };
  }
  const pct = (spent / budget) * 100;
  if (pct >= 100) {
    return {
      id: "over" as const,
      label: "Over Budget",
      className:
        "bg-[color-mix(in_srgb,var(--ds-status-red)_12%,transparent)] text-[var(--ds-status-red)]",
    };
  }
  if (pct >= 80) {
    return {
      id: "near" as const,
      label: "Near Limit",
      className:
        "bg-[color-mix(in_srgb,var(--ds-status-orange)_14%,transparent)] text-[var(--ds-status-orange)]",
    };
  }
  return {
    id: "ok" as const,
    label: "On Track",
    className:
      "bg-[color-mix(in_srgb,var(--ds-status-green)_12%,transparent)] text-[var(--ds-status-green)]",
  };
}

export function CategoryCard({
  category,
  currency,
  onEdit,
  onDelete,
}: {
  category: Category;
  currency: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const color = category.color || "#6B7280";
  const Icon = getCategoryIconComponent(category.icon);
  const spent = Number(category.spent_amount || 0);
  const budget = category.budget_amount
    ? Number(category.budget_amount)
    : null;
  const pct = budget && budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const status = budgetStatus(spent, budget);
  const txnCount = Number(category.transaction_count || 0);
  const updated = category.updated_at
    ? formatRelativeDay(category.updated_at.slice(0, 10))
    : "—";

  return (
    <article
      className="group relative flex min-h-[220px] flex-col overflow-hidden rounded-[16px] bg-[var(--ds-background-elevated)]"
      style={{
        boxShadow: `inset 3px 0 0 0 ${color}, 0 1px 2px rgba(0,0,0,0.06)`,
      }}
    >
      <div className="flex flex-1 flex-col p-4 pl-5">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{
              color,
              background: `color-mix(in srgb, ${color} 16%, transparent)`,
            }}
            aria-hidden
          >
            <Icon size={18} strokeWidth={1.85} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-[15px] font-semibold tracking-[-0.02em] text-[var(--ds-gray-1000)]">
                  {category.name}
                </h2>
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-[var(--ds-gray-700)]">
                  {category.description?.trim() ||
                    "No description yet for this category."}
                </p>
              </div>
              <ActionMenu
                label={`Actions for ${category.name}`}
                trigger={
                  <span
                    className="inline-flex size-8 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]"
                    aria-label={`Actions for ${category.name}`}
                  >
                    <MoreHorizontal size={16} />
                  </span>
                }
                items={[
                  ...(onEdit
                    ? [
                        {
                          id: "edit",
                          label: "Edit",
                          onSelect: onEdit,
                        },
                      ]
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
              />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[12px] bg-[var(--ds-background-100)] px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ds-gray-700)]">
                  Budget
                </p>
                <p className="mt-0.5 text-[13px] font-medium tabular-nums text-[var(--ds-gray-1000)]">
                  {budget
                    ? `${formatCurrency(budget, currency)} / ${periodLabel(category.budget_period)}`
                    : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ds-gray-700)]">
                  Spent
                </p>
                <p className="mt-0.5 text-[13px] font-medium tabular-nums text-[var(--ds-gray-1000)]">
                  {formatCurrency(spent, currency)}
                  {budget ? (
                    <span className="text-[var(--ds-gray-700)]">
                      {" "}
                      ({Math.round(pct)}%)
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[-0.01em]",
                status.className,
              )}
            >
              {status.label}
            </span>
          </div>
          <Progress className="mt-3" value={budget ? pct : 0} tone={color} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-[11px] text-[var(--ds-gray-700)]">
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeftRight size={12} aria-hidden />
            <span>
              <span className="font-medium text-[var(--ds-gray-900)]">
                {txnCount}
              </span>{" "}
              transaction{txnCount === 1 ? "" : "s"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={12} aria-hidden />
            <span>Updated {updated}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
