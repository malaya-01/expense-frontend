import type { CustomThemeInput, ThemeDefinition, ThemeTokens } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "").trim();
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  const num = parseInt(value, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function mix(hexA: string, hexB: string, weight: number) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return hexA;
  const w = clamp(weight, 0, 1);
  return rgbToHex(
    a.r + (b.r - a.r) * w,
    a.g + (b.g - a.g) * w,
    a.b + (b.b - a.b) * w,
  );
}

export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const channels = [rgb.r, rgb.g, rgb.b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastForeground(bg: string) {
  return luminance(bg) > 0.55 ? "#171717" : "#fafafa";
}

export function darken(hex: string, amount: number) {
  return mix(hex, "#000000", amount);
}

export function lighten(hex: string, amount: number) {
  return mix(hex, "#ffffff", amount);
}

/** 0 = grayscale, 1 = fully saturated. */
export function saturation(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const max = Math.max(rgb.r, rgb.g, rgb.b) / 255;
  const min = Math.min(rgb.r, rgb.g, rgb.b) / 255;
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  return d / (1 - Math.abs(2 * l - 1) || 1);
}

/**
 * Link accent that stays theme-specific but readable against body text.
 * Neutral focus colors (e.g. Charcoal gray) get a cool accent so links
 * do not blend into muted copy.
 */
export function resolveLinkColor(
  focusColor: string,
  opts: { isDark: boolean; gray900: string },
): string {
  const sat = saturation(focusColor);
  if (sat < 0.18) {
    return opts.isDark ? "#7dd3fc" : "#0072f5";
  }
  // Keep brand accent, but nudge lightness so it separates from muted body text.
  const focusLum = luminance(focusColor);
  const bodyLum = luminance(opts.gray900);
  if (Math.abs(focusLum - bodyLum) < 0.12) {
    return opts.isDark ? lighten(focusColor, 0.22) : darken(focusColor, 0.12);
  }
  return focusColor;
}

export function buildTokens(partial: Partial<ThemeTokens> & Pick<ThemeTokens, "background100" | "backgroundElevated" | "gray1000" | "gray900" | "focusColor">): ThemeTokens {
  const isDark = luminance(partial.background100) < 0.45;
  const background100 = partial.background100;
  const backgroundElevated = partial.backgroundElevated;
  const gray1000 = partial.gray1000;
  const gray900 = partial.gray900;
  const focusColor = partial.focusColor;
  const linkColor =
    partial.linkColor ??
    resolveLinkColor(focusColor, { isDark, gray900 });

  return {
    background100,
    background200:
      partial.background200 ??
      (isDark ? lighten(background100, 0.08) : darken(background100, 0.04)),
    backgroundElevated,
    gray100:
      partial.gray100 ??
      (isDark ? lighten(background100, 0.12) : darken(background100, 0.06)),
    gray1000,
    gray900,
    gray700:
      partial.gray700 ??
      (isDark ? lighten(gray900, 0.25) : darken(gray900, 0.15)),
    focusColor,
    linkColor,
    linkHover:
      partial.linkHover ??
      (isDark ? lighten(linkColor, 0.12) : darken(linkColor, 0.1)),
    focusInput: partial.focusInput ?? darken(focusColor, 0.12),
    focusRingInner: partial.focusRingInner ?? backgroundElevated,
    primaryHover: partial.primaryHover ?? darken(gray1000, 0.08),
    primaryForeground: partial.primaryForeground ?? contrastForeground(gray1000),
    dangerHover:
      partial.dangerHover ??
      (isDark ? "rgba(229, 72, 77, 0.12)" : "#fff5f5"),
    shadowAlpha: partial.shadowAlpha ?? (isDark ? "0.35" : "0.08"),
    headerBorderAlpha: partial.headerBorderAlpha ?? (isDark ? "0.25" : "0.1"),
    selectionAlpha: partial.selectionAlpha ?? (isDark ? "0.28" : "0.15"),
  };
}

export function createCustomTheme(input: CustomThemeInput, id?: string): ThemeDefinition {
  const tokens = buildTokens({
    background100: input.background100,
    backgroundElevated: input.backgroundElevated,
    gray1000: input.gray1000,
    gray900: input.gray900,
    focusColor: input.focusColor,
  });

  return {
    id: id ?? `custom:${crypto.randomUUID()}`,
    name: input.name.trim() || "Custom theme",
    description: "Your custom palette",
    tokens,
    builtin: false,
  };
}
