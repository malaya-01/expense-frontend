"use client";

import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { assetTypeLabel } from "@/lib/investments/meta";
import type { InvestmentHolding } from "@/types";

export function HoldingCard({
  holding,
  onEdit,
  onDelete,
}: {
  holding: InvestmentHolding;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const positive = holding.gain >= 0;

  return (
    <Card>
      <CardBody className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[var(--ds-gray-1000)]">
              {holding.name}
              {holding.symbol ? (
                <span className="ml-1.5 text-sm font-normal text-[var(--ds-gray-700)]">
                  {holding.symbol}
                </span>
              ) : null}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--ds-gray-700)]">
              {assetTypeLabel(holding.asset_type)}
              {holding.container_name ? ` · ${holding.container_name}` : ""}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-[var(--ds-gray-900)]">
            <StatusDot tone={positive ? "green" : "red"} />
            {positive ? "+" : ""}
            {holding.gain_percent.toFixed(1)}%
          </span>
        </div>

        <p className="mt-5 text-[22px] font-semibold leading-7 tracking-[-0.88px] tabular-nums text-[var(--ds-gray-1000)]">
          {formatCurrency(holding.market_value, holding.currency)}
        </p>
        <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
          Cost {formatCurrency(holding.cost_basis, holding.currency)} ·{" "}
          <span
            style={{
              color: positive
                ? "var(--ds-status-green)"
                : "var(--ds-status-red)",
            }}
          >
            {positive ? "+" : ""}
            {formatCurrency(holding.gain, holding.currency)}
          </span>
        </p>

        <p className="mt-3 text-[11px] tabular-nums text-[var(--ds-gray-700)]">
          {holding.quantity} × {formatCurrency(holding.current_price, holding.currency)}
          {" · "}avg {formatCurrency(holding.avg_cost, holding.currency)}
        </p>

        <div className="mt-4 flex gap-1">
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
