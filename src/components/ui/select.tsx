import { cn } from "@/lib/cn";
import type { SelectHTMLAttributes } from "react";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full appearance-none rounded-[6px] bg-[var(--ds-background-elevated)] px-3 text-[13.3px] text-[var(--ds-gray-1000)]",
        "ds-border outline-none",
        "focus:shadow-none focus:outline focus:outline-1 focus:outline-[var(--ds-focus-input)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
