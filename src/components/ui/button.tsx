import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-[13px]",
  lg: "h-11 px-5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[9px] font-medium leading-none transition-[background-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 ds-focus";

  const variants: Record<Variant, string> = {
    primary:
      "bg-[var(--ds-gray-1000)] text-[var(--ds-primary-foreground)] hover:bg-[var(--ds-primary-hover)]",
    secondary:
      "bg-[var(--ds-background-elevated)] text-[var(--ds-gray-1000)] ds-border hover:bg-[var(--ds-gray-100)]",
    ghost:
      "bg-transparent text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]",
    danger:
      "bg-[var(--ds-background-elevated)] text-[var(--ds-status-red)] ds-border hover:bg-[var(--ds-danger-hover)]",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(base, sizeClass[size], variants[variant], className)}
      {...props}
    >
      {loading ? (
        <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : null}
      {children}
    </button>
  );
}
