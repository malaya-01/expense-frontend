import { cn } from "@/lib/cn";
import { forwardRef, type TextareaHTMLAttributes } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { plain?: boolean }
>(function Textarea({ className, plain, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full text-[13px] leading-5 text-[var(--ds-gray-1000)] placeholder:text-[var(--ds-gray-700)]",
        "outline-none",
        plain
          ? "min-h-0 resize-none border-0 bg-transparent p-0 shadow-none"
          : "min-h-[80px] resize-y rounded-[9px] bg-[var(--ds-background-elevated)] px-3 py-2.5 ds-border sm:min-h-[104px] sm:px-3.5 sm:py-3 focus:shadow-none focus:outline focus:outline-2 focus:outline-[var(--ds-focus-input)]",
        className,
      )}
      {...props}
    />
  );
});
