"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/cn";
import { formatCurrency, formatRelativeDay } from "@/lib/format";
import type { AllocationSlice, AccountInsight } from "@/lib/accounts/insights";

function Donut({ slices }: { slices: AllocationSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) {
    return (
      <div className="mx-auto flex size-[112px] items-center justify-center rounded-full bg-[var(--ds-gray-100)] sm:size-[140px]">
        <p className="px-4 text-center text-[11px] text-[var(--ds-gray-700)]">
          Add balances to see allocation
        </p>
      </div>
    );
  }

  let cursor = 0;
  const stops = slices
    .filter((s) => s.value > 0)
    .map((slice) => {
      const start = cursor;
      const share = (slice.value / total) * 100;
      cursor += share;
      return `${slice.color} ${start}% ${cursor}%`;
    })
    .join(", ");

  return (
    <div
      className="relative mx-auto size-[112px] rounded-full sm:size-[140px]"
      style={{ background: `conic-gradient(${stops})` }}
      aria-hidden
    >
      <div className="absolute inset-[28px] rounded-full bg-[var(--ds-background-elevated)]" />
    </div>
  );
}

export function AccountsSidebar({
  insights,
  allocation,
  activity,
  currency,
}: {
  insights: AccountInsight[];
  allocation: AllocationSlice[];
  activity: Array<{
    id: string;
    accountName: string;
    accountColor: string;
    description: string;
    amount: number;
    currency: string;
    date: string;
    type: string;
  }>;
  currency: string;
}) {
  return (
    <aside className="min-w-0 max-w-full space-y-4 overflow-hidden xl:sticky xl:top-14">
      <section className="min-w-0 overflow-hidden rounded-[16px] bg-[var(--ds-background-elevated)] p-3 ds-border sm:p-5">
        <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Sparkles size={14} className="shrink-0 text-[var(--ds-focus-color)]" />
            <h2 className="truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
              AI Insights
            </h2>
          </div>
          <Link
            href="/ai"
            className="shrink-0 text-xs font-medium text-[var(--ds-focus-color)] hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="space-y-1.5">
          {insights.map((insight) => {
            const body = (
              <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-[10px] bg-[var(--ds-background-100)] px-2.5 py-2">
                <StatusDot tone={insight.tone} className="shrink-0" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-xs font-medium text-[var(--ds-gray-1000)]">
                    {insight.title}
                  </p>
                  <p
                    className="mt-0.5 truncate text-[11px] text-[var(--ds-gray-700)]"
                    title={insight.detail}
                  >
                    {insight.detail}
                  </p>
                </div>
              </div>
            );
            return insight.href ? (
              <Link key={insight.id} href={insight.href} className="block min-w-0">
                {body}
              </Link>
            ) : (
              <div key={insight.id} className="min-w-0">
                {body}
              </div>
            );
          })}
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-[16px] bg-[var(--ds-background-elevated)] p-3 ds-border sm:p-5">
        <h2 className="mb-3 truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
          Asset Allocation
        </h2>
        <Donut slices={allocation} />
        <ul className="mt-3 space-y-2">
          {allocation.map((slice) => (
            <li
              key={slice.id}
              className="flex min-w-0 items-center justify-between gap-3 overflow-hidden text-xs"
            >
              <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: slice.color }}
                />
                <span className="truncate text-[var(--ds-gray-900)]">
                  {slice.label}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-[var(--ds-gray-1000)]">
                {slice.percent.toFixed(1)}%
                <span className="ml-1.5 text-[var(--ds-gray-700)]">
                  {formatCurrency(slice.value, currency)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="min-w-0 overflow-hidden rounded-[16px] bg-[var(--ds-background-elevated)] p-3 ds-border sm:p-5">
        <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
          <h2 className="truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
            Recent Activity
          </h2>
          <Link
            href="/expenses"
            className="shrink-0 text-xs font-medium text-[var(--ds-focus-color)] hover:underline"
          >
            View all
          </Link>
        </div>
        {activity.length === 0 ? (
          <p className="text-xs text-[var(--ds-gray-700)]">
            No account-linked transactions yet.
          </p>
        ) : (
          <ul className="min-w-0">
            {activity.map((item) => (
              <li
                key={item.id}
                className="flex min-w-0 items-center justify-between gap-3 overflow-hidden py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                    style={{
                      color: item.accountColor,
                      background: `color-mix(in srgb, ${item.accountColor} 14%, transparent)`,
                    }}
                  >
                    {item.accountName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p
                      className="truncate text-xs font-medium text-[var(--ds-gray-1000)]"
                      title={item.description}
                    >
                      {item.description}
                    </p>
                    <p className="truncate text-[11px] text-[var(--ds-gray-700)]">
                      {formatRelativeDay(item.date)} · {item.accountName}
                    </p>
                  </div>
                </div>
                <p
                  className={cn(
                    "shrink-0 text-xs font-medium tabular-nums",
                    item.amount < 0
                      ? "text-[var(--ds-status-red)]"
                      : "text-[var(--ds-status-green)]",
                  )}
                >
                  {item.amount < 0 ? "−" : "+"}
                  {formatCurrency(Math.abs(item.amount), item.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
