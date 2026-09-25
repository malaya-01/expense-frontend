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
  const description = category.description?.trim();

  return (
    <article className="group relative flex min-h-0 flex-col overflow-hidden rounded-[16px] bg-[var(--ds-background-elevated)] ds-border">
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{
              color,
              background: `color-mix(in srgb, ${color} 18%, transparent)`,
            }}
            aria-hidden
          >
            <Icon size={18} strokeWidth={1.85} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold leading-5 tracking-[-0.02em] text-[var(--ds-gray-1000)] sm:text-[16px]">
                  {category.name}
                </h2>
                {description ? (
                  <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-[var(--ds-gray-700)] sm:text-[13px] sm:leading-5">
                    {description}
                  </p>
                ) : null}
              </div>
              {onEdit || onDelete ? (
                <ActionMenu
                  label={`Actions for ${category.name}`}
                  trigger={
                    <span
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]"
                      aria-label={`Actions for ${category.name}`}
                    >
                      <MoreHorizontal size={16} />
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

        <div className="mt-3.5">
          <p className="text-[13px] font-medium tabular-nums leading-5 text-[var(--ds-gray-1000)] sm:text-[14px]">
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

        <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-[12px] text-[var(--ds-gray-700)]">
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeftRight size={12} aria-hidden className="shrink-0" />
            <span>
              <span className="font-medium text-[var(--ds-gray-900)]">
                {txnCount}
              </span>{" "}
              txn{txnCount === 1 ? "" : "s"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={12} aria-hidden className="shrink-0" />
            <span>{updated}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
