import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  endAdornment?: ReactNode;
};

export function Input({
  className,
  error,
  id,
  endAdornment,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      <div className="relative">
        <input
          id={id}
          suppressHydrationWarning
          className={cn(
            "h-11 w-full rounded-[9px] bg-[var(--ds-background-elevated)] px-3.5 text-[13px] text-[var(--ds-gray-1000)] placeholder:text-[var(--ds-gray-700)]",
            "ds-border outline-none",
            "transition-[box-shadow,background-color] focus:bg-[var(--ds-background-elevated)] focus:shadow-none focus:outline focus:outline-2 focus:outline-[var(--ds-focus-input)]",
            Boolean(endAdornment) && "pr-11",
            error && "outline outline-1 outline-[var(--ds-status-red)]",
            className,
          )}
          {...props}
        />
        {endAdornment ? (
          <div className="absolute inset-y-0 right-1.5 flex items-center">
            {endAdornment}
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs leading-4 text-[var(--ds-status-red)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
