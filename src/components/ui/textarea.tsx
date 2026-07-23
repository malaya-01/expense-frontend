import { cn } from "@/lib/cn";
import { forwardRef, type TextareaHTMLAttributes } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[104px] w-full resize-y rounded-[9px] bg-[var(--ds-background-elevated)] px-3.5 py-3 text-[13px] leading-5 text-[var(--ds-gray-1000)] placeholder:text-[var(--ds-gray-700)]",
        "ds-border outline-none",
        "transition-[box-shadow,background-color] focus:shadow-none focus:outline focus:outline-2 focus:outline-[var(--ds-focus-input)]",
        className,
      )}
      {...props}
    />
  );
});
