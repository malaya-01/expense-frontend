import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export function Checkbox({
  id,
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-[10px] p-2 text-sm hover:bg-[var(--ds-background-100)]",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[6px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] text-[var(--ds-primary-foreground)] transition-colors peer-focus-visible:shadow-[var(--ds-focus-ring)]",
          checked &&
            "border-[var(--ds-focus-color)] bg-[var(--ds-focus-color)]",
        )}
      >
        {checked ? <Check size={13} strokeWidth={2.5} /> : null}
      </span>
      <span>
        <span className="block text-[13px] font-medium text-[var(--ds-gray-1000)]">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[11px] leading-4 text-[var(--ds-gray-700)]">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
