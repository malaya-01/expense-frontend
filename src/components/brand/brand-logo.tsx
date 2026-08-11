import { APP_NAME } from "@/lib/brand";

const MARK_SRC = "/brand/logo-mark.png";

type BrandLogoProps = {
  size?: number;
  showWordmark?: boolean;
  /** Rounded plate using the theme canvas — use for app-icon style. */
  plated?: boolean;
  className?: string;
};

export function BrandLogo({
  size = 28,
  showWordmark = false,
  plated = false,
  className = "",
}: BrandLogoProps) {
  const markSize = plated ? Math.round(size * 0.68) : size;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <span
        aria-hidden
        className="inline-flex shrink-0 items-center justify-center"
        style={{
          width: size,
          height: size,
          borderRadius: plated ? 7 : 0,
          background: plated ? "var(--ds-background-100)" : "transparent",
          boxShadow: plated
            ? "0 0 0 1px color-mix(in srgb, var(--ds-gray-1000) 10%, transparent)"
            : undefined,
        }}
      >
        <span
          style={{
            width: markSize,
            height: markSize,
            backgroundColor: "var(--ds-gray-1000)",
            WebkitMaskImage: `url(${MARK_SRC})`,
            maskImage: `url(${MARK_SRC})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
      </span>
      {showWordmark ? (
        <span className="text-sm font-semibold tracking-[-0.28px] text-[var(--ds-gray-1000)]">
          {APP_NAME}
        </span>
      ) : null}
    </span>
  );
}
