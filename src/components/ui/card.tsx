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
        "rounded-[14px] bg-[var(--ds-background-elevated)]",
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
    <div className={cn("px-5 pt-5 pb-2 sm:px-6 sm:pt-6", className)} {...props}>
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
    <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)} {...props}>
      {children}
    </div>
  );
}
