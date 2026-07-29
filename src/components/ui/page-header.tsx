import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { Button } from "./button";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-10 text-center sm:px-6 sm:py-14",
        className,
      )}
    >
      <h2 className="text-base font-semibold text-[var(--ds-gray-1000)]">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-5 text-[var(--ds-gray-700)]">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2.5 sm:mb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <h1 className="font-heading text-[22px] font-semibold leading-7 tracking-[-0.8px] text-[var(--ds-gray-1000)] sm:text-[28px] sm:leading-9">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 line-clamp-2 max-w-2xl text-xs leading-4 text-[var(--ds-gray-700)] sm:mt-1 sm:line-clamp-none sm:text-[13px] sm:leading-5">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
