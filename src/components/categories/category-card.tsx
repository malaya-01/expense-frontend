"use client";

import { ArrowLeftRight, CalendarDays, MoreHorizontal } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Progress } from "@/components/ui/feedback";
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
  const txnCount = Number(category.transaction_count || 0);
  const updated = category.updated_at
    ? formatRelativeDay(category.updated_at.slice(0, 10))
    : "—";

  return (
    <article className="group relative flex min-h-0 flex-col overflow-hidden rounded-[16px] bg-[var(--ds-background-elevated)] ds-border">
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full sm:size-10"
            style={{
              color,
              background: `color-mix(in srgb, ${color} 18%, transparent)`,
            }}
            aria-hidden
          >
            <Icon size={16} strokeWidth={1.85} className="sm:hidden" />
            <Icon size={18} strokeWidth={1.85} className="hidden sm:block" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <h2 className="truncate text-[13px] font-semibold tracking-[-0.02em] text-[var(--ds-gray-1000)] sm:text-[15px]">
                  {category.name}
                </h2>
                <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-[var(--ds-gray-700)] sm:line-clamp-2 sm:text-[12px]">
                  {category.description?.trim() || "No description yet."}
                </p>
              </div>
              {onEdit || onDelete ? (
                <ActionMenu
                  label={`Actions for ${category.name}`}
                  trigger={
                    <span
                      className="inline-flex size-7 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]"
                      aria-label={`Actions for ${category.name}`}
                    >
                      <MoreHorizontal size={15} />
                    </span>
                  }
                  items={[
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
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-[12px] font-medium tabular-nums text-[var(--ds-gray-1000)] sm:text-[13px]">
            {formatCurrency(spent, currency)}
            <span className="font-normal text-[var(--ds-gray-700)]">
              {" "}
              /{" "}
              {budget
                ? `${formatCurrency(budget, currency)}/${periodLabel(category.budget_period)}`
                : "No budget set"}
            </span>
          </p>
          <Progress
            className="mt-2"
            value={budget ? pct : 0}
            tone={budget ? color : "var(--ds-gray-400)"}
          />
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[10px] text-[var(--ds-gray-700)] sm:text-[11px]">
          <span className="inline-flex min-w-0 items-center gap-1">
            <ArrowLeftRight size={11} aria-hidden className="shrink-0" />
            <span className="truncate">
              <span className="font-medium text-[var(--ds-gray-900)]">
                {txnCount}
              </span>{" "}
              txn{txnCount === 1 ? "" : "s"}
            </span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <CalendarDays size={11} aria-hidden className="shrink-0" />
            <span className="truncate">Updated {updated}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
