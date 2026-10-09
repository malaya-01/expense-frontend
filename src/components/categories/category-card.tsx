"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  CalendarDays,
  MoreHorizontal,
  PiggyBank,
  Plus,
} from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Progress } from "@/components/ui/feedback";
import { getCategoryIconComponent } from "@/lib/categories/icons";
import { formatCurrency, formatRelativeDay } from "@/lib/format";
import type { Budget, Category } from "@/types";

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

export type CategoryBudgetSummary = {
  amount: number;
  spent: number;
  period: string;
  currency?: string;
  over: boolean;
};

/**
 * The budget a category card shows: the first budget created for it in the
 * Budgets module, falling back to the legacy per-category budget fields.
 */
export function primaryCategoryBudget(
  category: Category,
  budgets: Budget[] | undefined,
): CategoryBudgetSummary | null {
  const linked = budgets?.[0];
  if (linked) {
    return {
      amount: Number(linked.amount || 0),
      spent: Number(linked.spent || 0),
      period: linked.period_type,
      currency: linked.currency,
      over: linked.status === "over",
    };
  }
  const legacy = Number(category.budget_amount || 0);
  if (legacy > 0) {
    const spent = Number(category.spent_amount || 0);
    return {
      amount: legacy,
      spent,
      period: category.budget_period || "MONTHLY",
      over: spent > legacy,
    };
  }
  return null;
}

export function CategoryCard({
  category,
  currency,
  budgets,
  canAddBudget,
  onEdit,
  onDelete,
}: {
  category: Category;
  currency: string;
  /** Budgets from the Budgets module linked to this category. */
  budgets?: Budget[];
  canAddBudget?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const color = category.color || "#6B7280";
  const Icon = getCategoryIconComponent(category.icon);
  const linked = primaryCategoryBudget(category, budgets);
  const budgetCurrency = linked?.currency || currency;
  const spent = linked ? linked.spent : Number(category.spent_amount || 0);
  const budget = linked && linked.amount > 0 ? linked.amount : null;
  const pct = budget ? Math.min(100, (spent / budget) * 100) : 0;
  const extraBudgets = Math.max(0, (budgets?.length ?? 0) - 1);
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
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 text-[13px] font-medium tabular-nums leading-5 text-[var(--ds-gray-1000)] sm:text-[14px]">
              <span
                className={
                  linked?.over ? "text-[var(--ds-status-red)]" : undefined
                }
              >
                {formatCurrency(spent, budgetCurrency)}
              </span>
              <span className="font-normal text-[var(--ds-gray-700)]">
                {" "}
                /{" "}
                {budget
                  ? `${formatCurrency(budget, budgetCurrency)}/${periodLabel(linked?.period)}`
                  : "No budget set"}
              </span>
            </p>
            {budget ? (
              <Link
                href="/budgets"
                className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--ds-gray-700)] hover:text-[var(--ds-gray-1000)]"
              >
                <PiggyBank size={12} aria-hidden />
                {extraBudgets > 0 ? `+${extraBudgets} more` : "Budget"}
              </Link>
            ) : canAddBudget ? (
              <Link
                href={`/budgets?category=${encodeURIComponent(category.id)}`}
                className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--ds-status-blue)]"
              >
                <Plus size={12} aria-hidden />
                Set budget
              </Link>
            ) : null}
          </div>
          <Progress
            className="mt-2"
            value={budget ? pct : 0}
            tone={
              linked?.over
                ? "var(--ds-status-red)"
                : budget
                  ? color
                  : "var(--ds-gray-400)"
            }
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
