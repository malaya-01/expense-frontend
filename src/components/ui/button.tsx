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
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
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
    "inline-flex items-center justify-center gap-2 rounded-[6px] font-normal leading-none disabled:opacity-50 disabled:pointer-events-none ds-focus";

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
