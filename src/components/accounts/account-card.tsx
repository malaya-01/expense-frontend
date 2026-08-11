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
import { formatCurrency } from "@/lib/format";
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

  const detail = [meta.label, container.institution, container.currency]
    .filter(Boolean)
    .join(" · ");

  const menuItems = [
    onEdit ? { id: "edit", label: "Edit", onSelect: onEdit } : null,
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

  return (
    <article className="group relative w-full min-w-0 max-w-full overflow-hidden rounded-[12px] bg-[var(--ds-background-elevated)] ds-border sm:rounded-[16px]">
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="flex h-[4.25rem] min-w-0 items-center gap-2.5 overflow-hidden px-3 pl-4 sm:h-[4.75rem] sm:gap-3 sm:px-5">
        <div
          className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:size-10"
          style={{
            color: accent,
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
          }}
          title={container.institution || meta.label}
        >
          <span className="absolute inset-0 grid place-items-center">
            {container.institution ? (
              initials(container.institution)
            ) : (
              <Icon size={16} strokeWidth={1.85} />
            )}
          </span>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
            <h3 className="min-w-0 truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
              {container.name}
            </h3>
            <SyncBadge row={container} />
          </div>
          <p className="mt-0.5 truncate text-xs text-[var(--ds-gray-700)]" title={container.notes || detail}>
            {detail}
          </p>
        </div>

        <p
          className={cn(
            "shrink-0 text-right text-sm font-semibold tabular-nums",
            liability
              ? "text-[var(--ds-status-red)]"
              : "text-[var(--ds-gray-1000)]",
          )}
        >
          {liability ? "−" : ""}
          {formatCurrency(container.balance, container.currency)}
        </p>

        {menuItems.length ? (
          <ActionMenu
            label={`Actions for ${container.name}`}
            items={menuItems}
            trigger={
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]">
                <MoreHorizontal size={16} />
              </span>
            }
          />
        ) : null}
      </div>
    </article>
  );
}
