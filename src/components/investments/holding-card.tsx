"use client";

import { MoreHorizontal, TrendingUp } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { assetTypeLabel } from "@/lib/investments/meta";
import type { InvestmentHolding } from "@/types";

export function HoldingCard({
  holding,
  onEdit,
  onDelete,
}: {
  holding: InvestmentHolding;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const positive = holding.gain >= 0;
  const accent = positive ? "#7C3AED" : "#E5484D";

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
              <TrendingUp size={17} strokeWidth={1.85} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
                {holding.name}
                {holding.symbol ? (
                  <span className="ml-1.5 text-xs font-normal text-[var(--ds-gray-700)]">
                    {holding.symbol}
                  </span>
                ) : null}
              </h2>
              <p className="mt-0.5 truncate text-xs text-[var(--ds-gray-700)]">
                {assetTypeLabel(holding.asset_type)}
                {holding.container_name ? ` · ${holding.container_name}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums",
                positive
                  ? "bg-[color-mix(in_srgb,var(--ds-status-green)_12%,transparent)] text-[var(--ds-status-green)]"
                  : "bg-[color-mix(in_srgb,var(--ds-status-red)_12%,transparent)] text-[var(--ds-status-red)]",
              )}
            >
              {positive ? "+" : ""}
              {holding.gain_percent.toFixed(1)}%
            </span>
            <ActionMenu
              label={`Actions for ${holding.name}`}
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
              trigger={
                <span className="inline-flex size-8 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)]">
                  <MoreHorizontal size={16} />
                </span>
              }
            />
          </div>
        </div>

        <p className="mt-3 sm:mt-5 text-[18px] font-semibold leading-6 sm:text-[22px] sm:leading-7 tracking-[-0.88px] tabular-nums text-[var(--ds-gray-1000)]">
          {formatCurrency(holding.market_value, holding.currency)}
        </p>
        <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
          Cost {formatCurrency(holding.cost_basis, holding.currency)} ·{" "}
          <span
            className={
              positive
                ? "text-[var(--ds-status-green)]"
                : "text-[var(--ds-status-red)]"
            }
          >
            {positive ? "+" : ""}
            {formatCurrency(holding.gain, holding.currency)}
          </span>
        </p>

        <p className="mt-3 text-[11px] tabular-nums text-[var(--ds-gray-700)]">
          {holding.quantity} ×{" "}
          {formatCurrency(holding.current_price, holding.currency)}
          {" · "}avg {formatCurrency(holding.avg_cost, holding.currency)}
        </p>
      </div>
    </article>
  );
}
