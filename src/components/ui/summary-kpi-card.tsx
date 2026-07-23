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
        "rounded-[16px] bg-[var(--ds-background-elevated)] p-4 ds-border sm:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{
              color,
              background: `color-mix(in srgb, ${color} 14%, transparent)`,
            }}
          >
            <Icon size={17} strokeWidth={1.9} />
          </span>
        ) : (
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: color }}
            aria-hidden
          />
        )}
        <h2 className="truncate text-sm font-medium text-[var(--ds-gray-900)]">
          {title}
        </h2>
      </div>
      <p className="mt-4 text-[26px] font-semibold leading-8 tracking-[-1px] tabular-nums text-[var(--ds-gray-1000)] sm:text-[28px]">
        {value}
      </p>
      {subtitle ? (
        <p className="mt-2 text-xs leading-4 text-[var(--ds-gray-700)]">
          {subtitle}
        </p>
      ) : null}
      {footerLeft || footerRight ? (
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] pt-3">
          {footerLeft ? (
            <div>
              <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
                {footerLeft.label}
              </p>
              <p className="mt-0.5 text-xs font-medium tabular-nums text-[var(--ds-gray-1000)]">
                {footerLeft.value}
              </p>
            </div>
          ) : (
            <span />
          )}
          {footerRight ? (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
                {footerRight.label}
              </p>
              <p className="mt-0.5 text-xs font-medium tabular-nums text-[var(--ds-gray-1000)]">
                {footerRight.value}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
