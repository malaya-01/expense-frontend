import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/cn";

/** Quiet mark pulse. No popup, no motion. */
export function LogoLoader({
  className,
  size = 18,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn("inline-flex", className)}
      role="status"
      aria-label="Loading"
    >
      <BrandLogo size={size} plated className="opal-quiet-pulse" />
      <span className="sr-only">Loading</span>
    </span>
  );
}
