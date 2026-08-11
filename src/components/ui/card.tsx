import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  className,
  children,
  elevated = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  elevated?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 max-w-full overflow-x-hidden rounded-[12px] bg-[var(--ds-background-elevated)] sm:rounded-[14px]",
        elevated ? "ds-border-medium" : "ds-border",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-w-0 px-3.5 pt-3.5 pb-1.5 sm:px-6 sm:pt-6 sm:pb-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("min-w-0 px-3.5 pb-3.5 sm:px-6 sm:pb-6", className)} {...props}>
      {children}
    </div>
  );
}
