import { cn } from "@/lib/cn";

const STATUS_COLORS = {
  blue: "var(--ds-status-blue)",
  cyan: "var(--ds-status-cyan)",
  teal: "var(--ds-status-teal)",
  green: "var(--ds-status-green)",
  orange: "var(--ds-status-orange)",
  red: "var(--ds-status-red)",
  pink: "var(--ds-status-pink)",
  purple: "var(--ds-status-purple)",
} as const;

export type StatusTone = keyof typeof STATUS_COLORS;

export function StatusDot({
  tone = "green",
  className,
  color,
}: {
  tone?: StatusTone;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color || STATUS_COLORS[tone] }}
      aria-hidden
    />
  );
}
