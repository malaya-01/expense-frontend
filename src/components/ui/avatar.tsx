import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

export function Avatar({
  name,
  email,
  size = "md",
  className,
}: {
  name?: string | null;
  email?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "sm" ? "size-7 text-[10px]" : size === "lg" ? "size-10 text-sm" : "size-8 text-[11px]";

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--ds-gray-1000)] font-semibold text-[var(--ds-primary-foreground)]",
        sizeClass,
        className,
      )}
    >
      {initials(name, email)}
    </span>
  );
}
