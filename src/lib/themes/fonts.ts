/**
 * Font registry for themes. Every face is self-hosted at build time by
 * next/font/google in src/app/layout.tsx, which exposes it as a CSS variable
 * (`cssVar` below) on <html>. Themes reference fonts by id; apply.ts and the
 * pre-paint bootstrap script point the app-level indirection variables
 * (--font-app-sans / --font-app-heading / --font-geist-mono) at them.
 *
 * Keep `cssVar` in sync with the `variable` option in layout.tsx.
 */
export type FontId =
  | "jakarta"
  | "geist"
  | "manrope"
  | "dm-sans"
  | "plex-sans"
  | "space-grotesk"
  | "fraunces"
  | "jetbrains-mono"
  | "geist-mono"
  | "plex-mono";

export type FontRole = "sans" | "heading" | "mono";

export type FontOption = {
  id: FontId;
  label: string;
  /** CSS variable set by next/font on <html>. */
  cssVar: string;
  roles: FontRole[];
  /** Generic fallback stack appended after the web font. */
  fallback: string;
  /** font-feature-settings used for body text when this is the UI font. */
  features: string;
  /** One-line character description shown in pickers. */
  note: string;
};

const SANS_FALLBACK = "ui-sans-serif, system-ui, sans-serif";
const SERIF_FALLBACK = "ui-serif, Georgia, serif";
const MONO_FALLBACK = "ui-monospace, SFMono-Regular, Menlo, monospace";

export const FONT_OPTIONS: Record<FontId, FontOption> = {
  jakarta: {
    id: "jakarta",
    label: "Plus Jakarta Sans",
    cssVar: "--font-face-jakarta",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga", "ss01", "cv11"',
    note: "Friendly geometric",
  },
  geist: {
    id: "geist",
    label: "Geist",
    cssVar: "--font-face-geist",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Crisp engineering sans",
  },
  manrope: {
    id: "manrope",
    label: "Manrope",
    cssVar: "--font-face-manrope",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Open, modern grotesque",
  },
  "dm-sans": {
    id: "dm-sans",
    label: "DM Sans",
    cssVar: "--font-face-dm-sans",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Soft low-contrast sans",
  },
  "plex-sans": {
    id: "plex-sans",
    label: "IBM Plex Sans",
    cssVar: "--font-face-plex-sans",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Neutral, highly legible",
  },
  "space-grotesk": {
    id: "space-grotesk",
    label: "Space Grotesk",
    cssVar: "--font-face-space-grotesk",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Quirky technical grotesk",
  },
  fraunces: {
    id: "fraunces",
    label: "Fraunces",
    cssVar: "--font-face-fraunces",
    roles: ["heading"],
    fallback: SERIF_FALLBACK,
    features: '"liga"',
    note: "Warm editorial serif",
  },
  "jetbrains-mono": {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    cssVar: "--font-face-jetbrains-mono",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Tall, clear mono",
  },
  "geist-mono": {
    id: "geist-mono",
    label: "Geist Mono",
    cssVar: "--font-face-geist-mono",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Compact precise mono",
  },
  "plex-mono": {
    id: "plex-mono",
    label: "IBM Plex Mono",
    cssVar: "--font-face-plex-mono",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Humanist typewriter mono",
  },
};

export type ThemeFonts = {
  /** Body / UI font. */
  sans: FontId;
  /** Numeric + code font. */
  mono: FontId;
  /** Display / heading font (defaults to `sans`). */
  heading?: FontId;
};

export const DEFAULT_THEME_FONTS: Required<ThemeFonts> = {
  sans: "jakarta",
  heading: "jakarta",
  mono: "jetbrains-mono",
};

export function fontIdsForRole(role: FontRole): FontId[] {
  return (Object.keys(FONT_OPTIONS) as FontId[]).filter((id) =>
    FONT_OPTIONS[id].roles.includes(role),
  );
}

function isFontId(value: unknown, role: FontRole): value is FontId {
  return (
    typeof value === "string" &&
    value in FONT_OPTIONS &&
    FONT_OPTIONS[value as FontId].roles.includes(role)
  );
}

/** Validate a (possibly stale / remote) pairing and fill in defaults. */
export function resolveThemeFonts(
  fonts?: Partial<ThemeFonts> | null,
): Required<ThemeFonts> {
  const sans = isFontId(fonts?.sans, "sans")
    ? fonts!.sans!
    : DEFAULT_THEME_FONTS.sans;
  const mono = isFontId(fonts?.mono, "mono")
    ? fonts!.mono!
    : DEFAULT_THEME_FONTS.mono;
  const heading = isFontId(fonts?.heading, "heading") ? fonts!.heading! : sans;
  return { sans, mono, heading };
}

/** `font-family` value for a font id (web font first, then fallbacks). */
export function fontStack(id: FontId): string {
  const option = FONT_OPTIONS[id] ?? FONT_OPTIONS[DEFAULT_THEME_FONTS.sans];
  return `var(${option.cssVar}), ${option.fallback}`;
}

/** CSS custom properties the app reads (see globals.css). */
export function themeFontVariables(
  fonts?: Partial<ThemeFonts> | null,
): Record<string, string> {
  const resolved = resolveThemeFonts(fonts);
  return {
    "--font-app-sans": fontStack(resolved.sans),
    "--font-app-heading": fontStack(resolved.heading),
    "--font-geist-mono": fontStack(resolved.mono),
    "--font-app-features": FONT_OPTIONS[resolved.sans].features,
  };
}

export function describeFonts(fonts?: Partial<ThemeFonts> | null): string {
  const resolved = resolveThemeFonts(fonts);
  const sans = FONT_OPTIONS[resolved.sans].label;
  const heading = FONT_OPTIONS[resolved.heading].label;
  const mono = FONT_OPTIONS[resolved.mono].label;
  return heading === sans
    ? `${sans} · ${mono}`
    : `${heading} + ${sans} · ${mono}`;
}

/** Named pairings offered for custom themes. */
export const FONT_PAIRINGS: Array<{
  id: string;
  label: string;
  fonts: Required<ThemeFonts>;
}> = [
  { id: "jakarta", label: "Jakarta + JetBrains", fonts: { sans: "jakarta", heading: "jakarta", mono: "jetbrains-mono" } },
  { id: "geist", label: "Geist + Geist Mono", fonts: { sans: "geist", heading: "geist", mono: "geist-mono" } },
  { id: "manrope", label: "Manrope + JetBrains", fonts: { sans: "manrope", heading: "manrope", mono: "jetbrains-mono" } },
  { id: "plex", label: "IBM Plex family", fonts: { sans: "plex-sans", heading: "plex-sans", mono: "plex-mono" } },
  { id: "grotesk", label: "Space Grotesk + JetBrains", fonts: { sans: "space-grotesk", heading: "space-grotesk", mono: "jetbrains-mono" } },
  { id: "editorial", label: "Fraunces + DM Sans", fonts: { sans: "dm-sans", heading: "fraunces", mono: "plex-mono" } },
  { id: "studio", label: "Space Grotesk + DM Sans", fonts: { sans: "dm-sans", heading: "space-grotesk", mono: "geist-mono" } },
];

export function pairingIdFor(fonts?: Partial<ThemeFonts> | null): string {
  const resolved = resolveThemeFonts(fonts);
  return (
    FONT_PAIRINGS.find(
      (pairing) =>
        pairing.fonts.sans === resolved.sans &&
        pairing.fonts.heading === resolved.heading &&
        pairing.fonts.mono === resolved.mono,
    )?.id ?? "custom"
  );
}
