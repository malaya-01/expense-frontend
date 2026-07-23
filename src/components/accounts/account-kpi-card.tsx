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
    <article className="rounded-[16px] bg-[var(--ds-background-elevated)] p-4 ds-border sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{
              color: accent,
              background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            }}
          >
            <Icon size={17} strokeWidth={1.9} />
          </span>
          <h2 className="truncate text-sm font-medium text-[var(--ds-gray-900)]">
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

      <p className="mt-4 text-[26px] font-semibold leading-8 tracking-[-1px] tabular-nums text-[var(--ds-gray-1000)] sm:text-[28px]">
        {formatCurrency(value, currency)}
      </p>

      <p
        className={cn(
          "mt-2 flex flex-wrap items-center gap-1 text-xs tabular-nums",
          positive
            ? "text-[var(--ds-status-green)]"
            : "text-[var(--ds-status-red)]",
        )}
      >
        <DeltaIcon size={13} strokeWidth={2.2} className="shrink-0" />
        <span>
          {formatCurrency(Math.abs(delta.amount), currency)}
          {delta.percent != null ? ` (${Math.abs(delta.percent).toFixed(1)}%)` : ""}
        </span>
        <span className="text-[var(--ds-gray-700)]">this month</span>
      </p>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
            {footerLeft.label}
          </p>
          <p className="mt-0.5 text-xs font-medium tabular-nums text-[var(--ds-gray-1000)]">
            {footerLeft.value}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
            {footerRight.label}
          </p>
          <p className="mt-0.5 text-xs font-medium tabular-nums text-[var(--ds-gray-1000)]">
            {footerRight.value}
          </p>
        </div>
      </div>
    </article>
  );
}
