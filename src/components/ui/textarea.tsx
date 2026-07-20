import { cn } from "@/lib/cn";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[96px] w-full resize-y rounded-[6px] bg-transparent px-3 py-2.5 text-[13.3px] text-[var(--ds-gray-1000)] placeholder:text-[var(--ds-gray-700)]",
        "ds-border outline-none",
        "focus:shadow-none focus:outline focus:outline-1 focus:outline-[var(--ds-focus-input)]",
        className,
      )}
      {...props}
    />
  );
}
