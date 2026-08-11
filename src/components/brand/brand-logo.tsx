import { APP_NAME } from "@/lib/brand";

type BrandLogoProps = {
  size?: number;
  showWordmark?: boolean;
  /** Rounded app-icon plate that follows the active theme. */
  plated?: boolean;
  className?: string;
};

export function BrandLogo({
  size = 28,
  showWordmark = false,
  plated = false,
  className = "",
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <span
        aria-hidden
        className="inline-block shrink-0 bg-center bg-no-repeat"
        style={{
          width: size,
          height: size,
          borderRadius: plated ? Math.round(size * 0.22) : 0,
          backgroundImage: plated
            ? "var(--brand-logo-plated)"
            : "var(--brand-logo-mark)",
          backgroundSize: plated ? "cover" : "contain",
        }}
      />
      {showWordmark ? (
        <span className="text-sm font-semibold tracking-[-0.28px] text-[var(--ds-gray-1000)]">
          {APP_NAME}
        </span>
      ) : null}
    </span>
  );
}
