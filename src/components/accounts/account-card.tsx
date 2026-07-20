"use client";

import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { getContainerMeta, isLiabilityType } from "@/lib/accounts/types-meta";
import type { FinancialContainer } from "@/types";

export function AccountCard({
  container,
  onEdit,
  onDelete,
}: {
  container: FinancialContainer;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = getContainerMeta(container.type);
  const liability = isLiabilityType(container.type);

  return (
    <Card>
      <CardBody className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <StatusDot color={container.color || meta.defaultColor} />
            <div className="min-w-0">
              <h2 className="truncate text-[var(--ds-gray-1000)]">
                {container.name}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--ds-gray-700)]">
                {meta.label} · {container.currency}
                {container.institution ? ` · ${container.institution}` : ""}
              </p>
            </div>
          </div>
          {!container.include_in_net_worth ? (
            <span className="shrink-0 rounded-full bg-[var(--ds-gray-100)] px-2 py-0.5 text-[10px] text-[var(--ds-gray-700)]">
              Excluded
            </span>
          ) : null}
        </div>

        <p
          className="mt-5 text-[28px] font-semibold leading-8 tracking-[-1.12px] tabular-nums"
          style={{
            color: liability
              ? "var(--finos-danger)"
              : "var(--ds-gray-1000)",
          }}
        >
          {liability ? "−" : ""}
          {formatCurrency(container.balance, container.currency)}
        </p>
        <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
          {liability ? "Outstanding liability" : "Asset balance"}
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
