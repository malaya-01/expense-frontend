import { cn } from "@/lib/cn";
import type { SelectHTMLAttributes } from "react";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-[9px] bg-[var(--ds-background-elevated)] px-3 pr-9 text-[13px] text-[var(--ds-gray-1000)] sm:h-11 sm:px-3.5",
          "ds-border outline-none",
          "transition-[box-shadow,background-color] focus:shadow-none focus:outline focus:outline-2 focus:outline-[var(--ds-focus-input)]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--ds-gray-700)]"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}
