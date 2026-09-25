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
    <div className="mb-3 sm:mb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-[22px] font-semibold leading-8 tracking-[-0.6px] text-[var(--ds-gray-1000)] sm:text-[28px] sm:leading-9">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-[13px] leading-5 text-[var(--ds-gray-700)] sm:mt-1 sm:text-sm">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {actions}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="mt-2.5 flex items-center gap-2 sm:hidden [&_button]:h-10 [&_button]:flex-1 [&_button]:justify-center">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
