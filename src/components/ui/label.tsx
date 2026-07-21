import { cn } from "@/lib/cn";
import type { LabelHTMLAttributes } from "react";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-[12px] font-medium leading-5 text-[var(--ds-gray-900)]",
        className,
      )}
      {...props}
    />
  );
}
