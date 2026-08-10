import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { MiniSparkline } from "@/components/ui/mini-sparkline";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import type { KpiDelta } from "@/lib/accounts/insights";

export function AccountKpiCard({
  title,
  value,
  currency,
  delta,
  series,
  icon: Icon,
  accent,
  footerLeft,
  footerRight,
  invertDelta = false,
}: {
  title: string;
  value: number;
  currency: string;
  delta: KpiDelta;
  series: number[];
  icon: LucideIcon;
  accent: string;
  footerLeft: { label: string; value: string };
  footerRight: { label: string; value: string };
  /** When true, rising values are bad (e.g. liabilities). */
  invertDelta?: boolean;
}) {
  const positive = invertDelta ? delta.amount <= 0 : delta.amount >= 0;
  const DeltaIcon = delta.amount >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <article
      className="rounded-[12px] bg-[var(--ds-background-elevated)] p-3 ds-border sm:rounded-[16px] sm:p-5"
      data-kpi-card
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] sm:size-9 sm:rounded-[10px]"
            style={{
              color: accent,
              background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            }}
          >
            <Icon size={15} strokeWidth={1.9} className="sm:hidden" />
            <Icon size={17} strokeWidth={1.9} className="hidden sm:block" />
          </span>
          <h2 className="truncate text-[11px] font-medium text-[var(--ds-gray-900)] sm:text-sm">
            {title}
          </h2>
        </div>
        <MiniSparkline
          values={series}
          stroke={accent}
          fill={accent}
          className="hidden sm:block"
        />
      </div>

      <p className="mt-2 text-[20px] font-semibold leading-6 tracking-[-1px] tabular-nums text-[var(--ds-gray-1000)] sm:mt-4 sm:text-[28px] sm:leading-8" data-kpi-value>
        {formatCurrency(value, currency)}
      </p>

      <p
        className={cn(
          "mt-1 flex flex-wrap items-center gap-1 text-[10px] tabular-nums sm:mt-2 sm:text-xs",
          positive
            ? "text-[var(--ds-status-green)]"
            : "text-[var(--ds-status-red)]",
        )}
      >
        <DeltaIcon size={12} strokeWidth={2.2} className="shrink-0" />
        <span>
          {formatCurrency(Math.abs(delta.amount), currency)}
          {delta.percent != null ? ` (${Math.abs(delta.percent).toFixed(1)}%)` : ""}
        </span>
        <span className="text-[var(--ds-gray-700)]">this month</span>
      </p>

      <div className="mt-2 flex items-end justify-between gap-2 border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] pt-2 sm:mt-4 sm:gap-3 sm:pt-3">
        <div className="min-w-0">
          <p className="truncate text-[9px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)] sm:text-[10px]">
            {footerLeft.label}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium tabular-nums text-[var(--ds-gray-1000)] sm:text-xs">
            {footerLeft.value}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate text-[9px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)] sm:text-[10px]">
            {footerRight.label}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium tabular-nums text-[var(--ds-gray-1000)] sm:text-xs">
            {footerRight.value}
          </p>
        </div>
      </div>
    </article>
  );
}
