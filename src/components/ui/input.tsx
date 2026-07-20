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
        className={cn(
          "h-10 w-full rounded-[6px] bg-transparent px-3 text-[13.3px] text-[var(--ds-gray-1000)] placeholder:text-[var(--ds-gray-700)]",
          "ds-border outline-none",
          "focus:shadow-none focus:outline focus:outline-1 focus:outline-[var(--ds-focus-input)]",
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
