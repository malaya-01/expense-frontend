import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

export function Input({ className, error, id, ...props }: InputProps) {
  return (
    <div className="w-full">
      <input
        id={id}
        suppressHydrationWarning
        className={cn(
          "h-11 w-full rounded-[9px] bg-[var(--ds-background-elevated)] px-3.5 text-[13px] text-[var(--ds-gray-1000)] placeholder:text-[var(--ds-gray-700)]",
          "ds-border outline-none",
          "transition-[box-shadow,background-color] focus:bg-[var(--ds-background-elevated)] focus:shadow-none focus:outline focus:outline-2 focus:outline-[var(--ds-focus-input)]",
          error && "outline outline-1 outline-[var(--ds-status-red)]",
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs leading-4 text-[var(--ds-status-red)]">{error}</p>
      ) : null}
    </div>
  );
}
