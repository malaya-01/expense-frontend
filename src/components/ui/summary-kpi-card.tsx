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
        "rounded-[12px] bg-[var(--ds-background-elevated)] p-3 ds-border sm:rounded-[16px] sm:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {Icon ? (
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] sm:size-9 sm:rounded-[10px]"
            style={{
              color,
              background: `color-mix(in srgb, ${color} 14%, transparent)`,
            }}
          >
            <Icon size={15} strokeWidth={1.9} className="sm:hidden" />
            <Icon size={17} strokeWidth={1.9} className="hidden sm:block" />
          </span>
        ) : (
          <span
            className="size-2 shrink-0 rounded-full sm:size-2.5"
            style={{ background: color }}
            aria-hidden
          />
        )}
        <h2 className="truncate text-[11px] font-medium text-[var(--ds-gray-900)] sm:text-sm">
          {title}
        </h2>
      </div>
      <p className="mt-2 text-[20px] font-semibold leading-6 tracking-[-1px] tabular-nums text-[var(--ds-gray-1000)] sm:mt-4 sm:text-[28px] sm:leading-8">
        {value}
      </p>
      {subtitle ? (
        <p className="mt-1 line-clamp-2 text-[10px] leading-3.5 text-[var(--ds-gray-700)] sm:mt-2 sm:line-clamp-none sm:text-xs sm:leading-4">
          {subtitle}
        </p>
      ) : null}
      {footerLeft || footerRight ? (
        <div className="mt-2 flex items-end justify-between gap-2 border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] pt-2 sm:mt-4 sm:gap-3 sm:pt-3">
          {footerLeft ? (
            <div className="min-w-0">
              <p className="truncate text-[9px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)] sm:text-[10px]">
                {footerLeft.label}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-medium tabular-nums text-[var(--ds-gray-1000)] sm:text-xs">
                {footerLeft.value}
              </p>
            </div>
          ) : (
            <span />
          )}
          {footerRight ? (
            <div className="min-w-0 text-right">
              <p className="truncate text-[9px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)] sm:text-[10px]">
                {footerRight.label}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-medium tabular-nums text-[var(--ds-gray-1000)] sm:text-xs">
                {footerRight.value}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
