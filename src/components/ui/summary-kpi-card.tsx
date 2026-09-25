import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const TONE_ACCENT = {
  blue: "var(--ds-status-blue)",
  cyan: "var(--ds-status-cyan)",
  teal: "var(--ds-status-teal)",
  green: "var(--ds-status-green)",
  orange: "var(--ds-status-orange)",
  red: "var(--ds-status-red)",
  pink: "var(--ds-status-pink)",
  purple: "var(--ds-status-purple)",
} as const;

export function SummaryKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  tone = "green",
  footerLeft,
  footerRight,
  className,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: string;
  tone?: keyof typeof TONE_ACCENT;
  footerLeft?: { label: string; value: string };
  footerRight?: { label: string; value: string };
  className?: string;
}) {
  const color = accent || TONE_ACCENT[tone];

  return (
    <article
      className={cn(
        "min-w-0 max-w-full overflow-hidden rounded-[12px] bg-[var(--ds-background-elevated)] p-3.5 ds-border sm:rounded-[16px] sm:p-5",
        className,
      )}
      data-kpi-card
    >
      <div className="flex items-center gap-2">
        {Icon ? (
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] sm:size-9 sm:rounded-[10px]"
            style={{
              color,
              background: `color-mix(in srgb, ${color} 14%, transparent)`,
            }}
          >
            <Icon size={16} strokeWidth={1.9} />
          </span>
        ) : (
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: color }}
            aria-hidden
          />
        )}
        <h2 className="truncate text-[12px] font-medium text-[var(--ds-gray-900)] sm:text-sm">
          {title}
        </h2>
      </div>
      <p
        className="mt-2.5 truncate text-[18px] font-semibold leading-6 tracking-[-0.04em] tabular-nums text-[var(--ds-gray-1000)] sm:mt-4 sm:text-[28px] sm:leading-8"
        data-kpi-value
      >
        {value}
      </p>
      {subtitle ? (
        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--ds-gray-700)] sm:mt-2 sm:line-clamp-none sm:text-xs">
          {subtitle}
        </p>
      ) : null}
      {footerLeft || footerRight ? (
        <div className="mt-2.5 flex items-end justify-between gap-2 border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] pt-2.5 sm:mt-4 sm:gap-3 sm:pt-3">
          {footerLeft ? (
            <div className="min-w-0">
              <p className="truncate text-[10px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
                {footerLeft.label}
              </p>
              <p className="mt-0.5 truncate text-[12px] font-medium tabular-nums text-[var(--ds-gray-1000)]">
                {footerLeft.value}
              </p>
            </div>
          ) : (
            <span />
          )}
          {footerRight ? (
            <div className="min-w-0 text-right">
              <p className="truncate text-[10px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
                {footerRight.label}
              </p>
              <p className="mt-0.5 truncate text-[12px] font-medium tabular-nums text-[var(--ds-gray-1000)]">
                {footerRight.value}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
