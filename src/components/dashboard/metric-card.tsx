import type { LucideIcon } from "lucide-react";
import { StatusDot, type StatusTone } from "@/components/ui/status-dot";
import { SummaryKpiCard } from "@/components/ui/summary-kpi-card";

/** Shared KPI chrome used across dashboard, reports, and entity pages. */
export function MetricCard({
  title,
  value,
  subtitle,
  tone = "green",
  icon,
  footerLeft,
  footerRight,
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone?: StatusTone;
  icon?: LucideIcon;
  footerLeft?: { label: string; value: string };
  footerRight?: { label: string; value: string };
}) {
  if (icon || footerLeft || footerRight) {
    return (
      <SummaryKpiCard
        title={title}
        value={value}
        subtitle={subtitle}
        tone={tone}
        icon={icon}
        footerLeft={footerLeft}
        footerRight={footerRight}
      />
    );
  }

  return (
    <SummaryKpiCard
      title={title}
      value={value}
      subtitle={subtitle}
      tone={tone}
    />
  );
}

/** Tiny helper kept for callers that only need a status chip next to a label. */
export function MetricStatus({
  label,
  tone = "green",
}: {
  label: string;
  tone?: StatusTone;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--ds-gray-900)]">
      <StatusDot tone={tone} />
      {label}
    </span>
  );
}
