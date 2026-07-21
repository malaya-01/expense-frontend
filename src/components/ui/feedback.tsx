import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

const toneStyles = {
  info: {
    icon: Info,
    className: "text-[var(--ds-focus-color)]",
  },
  success: {
    icon: CheckCircle2,
    className: "text-[var(--ds-status-green)]",
  },
  warning: {
    icon: TriangleAlert,
    className: "text-[var(--ds-status-orange)]",
  },
  error: {
    icon: AlertCircle,
    className: "text-[var(--ds-status-red)]",
  },
} as const;

export function Alert({
  title,
  description,
  tone = "info",
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  description?: string;
  tone?: keyof typeof toneStyles;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  const style = toneStyles[tone];
  const Icon = style.icon;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-[12px] bg-[var(--ds-background-elevated)] p-4 ds-strong-border",
        className,
      )}
    >
      <Icon size={18} className={cn("mt-0.5 shrink-0", style.className)} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[var(--ds-gray-1000)]">
          {title}
        </p>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-[var(--ds-gray-700)]">
            {description}
          </p>
        ) : null}
      </div>
      {actionLabel && onAction ? (
        <Button size="sm" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "block animate-pulse rounded-[8px] bg-[var(--ds-gray-100)]",
        className,
      )}
    />
  );
}

export function PageSkeleton() {
  return (
    <div aria-label="Loading content" role="status" className="space-y-7">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-[14px] bg-[var(--ds-background-elevated)] p-5 ds-border"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-7 w-36" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-[14px]" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading cards"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: count }, (_, item) => (
        <div
          key={item}
          className="rounded-[14px] bg-[var(--ds-background-elevated)] p-5 ds-border"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-6 h-7 w-36" />
          <Skeleton className="mt-4 h-2 w-full rounded-full" />
          <Skeleton className="mt-4 h-3 w-24" />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  className?: string;
}) {
  const tones = {
    neutral:
      "bg-[var(--ds-gray-100)] text-[var(--ds-gray-900)]",
    info: "bg-[color-mix(in_srgb,var(--ds-focus-color)_12%,transparent)] text-[var(--ds-focus-color)]",
    success:
      "bg-[color-mix(in_srgb,var(--ds-status-green)_12%,transparent)] text-[var(--ds-status-green-dark)]",
    warning:
      "bg-[color-mix(in_srgb,var(--ds-status-orange)_14%,transparent)] text-[var(--ds-status-orange)]",
    danger:
      "bg-[var(--ds-danger-hover)] text-[var(--ds-status-red)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Progress({
  value,
  label,
  tone = "var(--ds-focus-color)",
  className,
}: {
  value: number;
  label?: string;
  tone?: string;
  className?: string;
}) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <div className={className}>
      {label ? (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-[var(--ds-gray-900)]">{label}</span>
          <span className="tabular-nums text-[var(--ds-gray-700)]">
            {Math.round(normalized)}%
          </span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(normalized)}
        className="h-1.5 overflow-hidden rounded-full bg-[var(--ds-gray-100)]"
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${normalized}%`, background: tone }}
        />
      </div>
    </div>
  );
}
