"use client";

import {
  Building2,
  CreditCard,
  Landmark,
  MoreHorizontal,
  PiggyBank,
  Users,
  Wallet,
} from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { cn } from "@/lib/cn";
import { formatCurrency, formatRelativeDay } from "@/lib/format";
import {
  getContainerMeta,
  isLiabilityType,
} from "@/lib/accounts/types-meta";
import type { FinancialContainer } from "@/types";
import { SyncBadge } from "@/components/sync/sync-badge";

function typeIcon(type: FinancialContainer["type"]) {
  switch (type) {
    case "cash":
    case "wallet":
      return Wallet;
    case "bank":
      return Landmark;
    case "credit_card":
    case "loan":
    case "payable":
      return CreditCard;
    case "investment":
    case "gold":
    case "crypto":
      return PiggyBank;
    case "receivable":
      return Users;
    default:
      return Building2;
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function AccountCard({
  container,
  onEdit,
  onDelete,
}: {
  container: FinancialContainer;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const meta = getContainerMeta(container.type);
  const liability = isLiabilityType(container.type);
  const accent = container.color || meta.defaultColor;
  const Icon = typeIcon(container.type);
  const updated = container.updated_at
    ? formatRelativeDay(container.updated_at.slice(0, 10))
    : "—";

  return (
    <article className="group relative overflow-hidden rounded-[12px] bg-[var(--ds-background-elevated)] ds-border sm:rounded-[16px]">
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="flex items-center gap-2.5 px-3 py-2.5 pl-4 sm:gap-4 sm:px-5 sm:py-4">
        <div
          className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:size-11 sm:text-sm"
          style={{
            color: accent,
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
          }}
          title={container.institution || meta.label}
        >
          <span className="absolute inset-0 grid place-items-center opacity-100 group-hover:opacity-0">
            {container.institution ? initials(container.institution) : (
              <Icon size={18} strokeWidth={1.85} />
            )}
          </span>
          <span className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100">
            <Icon size={18} strokeWidth={1.85} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
              {container.name}
            </h3>
            <SyncBadge row={container} />
            {!container.include_in_net_worth ? (
              <span className="rounded-full bg-[var(--ds-gray-100)] px-2 py-0.5 text-[10px] font-medium text-[var(--ds-gray-700)]">
                Excluded
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-[var(--ds-gray-700)]">
            {meta.label}
            {container.institution ? ` · ${container.institution}` : ""}
            {` · ${container.currency}`}
          </p>
          <p className="mt-1 text-[11px] text-[var(--ds-gray-700)]">
            Updated {updated}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={cn(
              "text-sm font-semibold tabular-nums sm:text-base",
              liability
                ? "text-[var(--ds-status-red)]"
                : "text-[var(--ds-gray-1000)]",
            )}
          >
            {liability ? "−" : ""}
            {formatCurrency(container.balance, container.currency)}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--ds-gray-700)]">
            {liability ? "Outstanding" : "Available balance"}
          </p>
        </div>

        {(() => {
          const items = [
            onEdit
              ? { id: "edit", label: "Edit", onSelect: onEdit }
              : null,
            onDelete
              ? {
                  id: "archive",
                  label: "Archive",
                  tone: "danger" as const,
                  onSelect: onDelete,
                }
              : null,
          ].filter(Boolean) as {
            id: string;
            label: string;
            onSelect: () => void;
            tone?: "default" | "danger";
          }[];
          if (!items.length) return null;
          return (
            <ActionMenu
              label={`Actions for ${container.name}`}
              items={items}
              trigger={
                <span className="inline-flex size-8 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]">
                  <MoreHorizontal size={16} />
                </span>
              }
            />
          );
        })()}
      </div>
    </article>
  );
}
