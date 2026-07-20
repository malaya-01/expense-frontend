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
        "rounded-[12px] bg-[var(--ds-background-elevated)]",
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
    <div className={cn("px-6 pt-6 pb-2", className)} {...props}>
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
    <div className={cn("px-6 pb-6", className)} {...props}>
      {children}
    </div>
  );
}
