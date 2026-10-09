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
  | "inter"
  | "manrope"
  | "dm-sans"
  | "plex-sans"
  | "space-grotesk"
  | "outfit"
  | "sora"
  | "atkinson"
  | "archivo"
  | "fraunces"
  | "newsreader"
  | "lora"
  | "merriweather"
  | "bodoni"
  | "cormorant"
  | "jetbrains-mono"
  | "geist-mono"
  | "plex-mono"
  | "dm-mono"
  | "inconsolata"
  | "roboto-mono"
  | "fira-code"
  | "azeret-mono"
  | "source-code-pro"
  | "ubuntu-mono"
  | "pt-mono"
  | "red-hat-mono"
  | "space-mono"
  | "victor-mono"
  | "martian-mono"
  | "cutive-mono"
  | "oxygen-mono";

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
  "jakarta": {
    id: "jakarta",
    label: "Plus Jakarta Sans",
    cssVar: "--font-face-jakarta",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Balanced, contemporary sans",
  },
  "geist": {
    id: "geist",
    label: "Geist",
    cssVar: "--font-face-geist",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Crisp engineering sans",
  },
  "inter": {
    id: "inter",
    label: "Inter",
    cssVar: "--font-face-inter",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Neutral, highly legible sans",
  },
  "manrope": {
    id: "manrope",
    label: "Manrope",
    cssVar: "--font-face-manrope",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Rounded, open grotesque",
  },
  "dm-sans": {
    id: "dm-sans",
    label: "DM Sans",
    cssVar: "--font-face-dm-sans",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Friendly low-contrast sans",
  },
  "plex-sans": {
    id: "plex-sans",
    label: "IBM Plex Sans",
    cssVar: "--font-face-plex-sans",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Structured, utilitarian sans",
  },
  "space-grotesk": {
    id: "space-grotesk",
    label: "Space Grotesk",
    cssVar: "--font-face-space-grotesk",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Geometric technical grotesk",
  },
  "outfit": {
    id: "outfit",
    label: "Outfit",
    cssVar: "--font-face-outfit",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Rounded and expressive",
  },
  "sora": {
    id: "sora",
    label: "Sora",
    cssVar: "--font-face-sora",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Distinctive geometric sans",
  },
  "atkinson": {
    id: "atkinson",
    label: "Atkinson Hyperlegible",
    cssVar: "--font-face-atkinson",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Built for character recognition",
  },
  "archivo": {
    id: "archivo",
    label: "Archivo",
    cssVar: "--font-face-archivo",
    roles: ["sans", "heading"],
    fallback: SANS_FALLBACK,
    features: '"liga"',
    note: "Strong, compact grotesque",
  },
  "fraunces": {
    id: "fraunces",
    label: "Fraunces",
    cssVar: "--font-face-fraunces",
    roles: ["sans", "heading"],
    fallback: SERIF_FALLBACK,
    features: '"liga"',
    note: "Characterful soft serif",
  },
  "newsreader": {
    id: "newsreader",
    label: "Newsreader",
    cssVar: "--font-face-newsreader",
    roles: ["sans", "heading"],
    fallback: SERIF_FALLBACK,
    features: '"liga"',
    note: "Restrained editorial serif",
  },
  "lora": {
    id: "lora",
    label: "Lora",
    cssVar: "--font-face-lora",
    roles: ["sans", "heading"],
    fallback: SERIF_FALLBACK,
    features: '"liga"',
    note: "Readable literary serif",
  },
  "merriweather": {
    id: "merriweather",
    label: "Merriweather",
    cssVar: "--font-face-merriweather",
    roles: ["sans", "heading"],
    fallback: SERIF_FALLBACK,
    features: '"liga"',
    note: "Sturdy, bookish serif",
  },
  "bodoni": {
    id: "bodoni",
    label: "Bodoni Moda",
    cssVar: "--font-face-bodoni",
    roles: ["sans", "heading"],
    fallback: SERIF_FALLBACK,
    features: '"liga"',
    note: "High-contrast luxury serif",
  },
  "cormorant": {
    id: "cormorant",
    label: "Cormorant Garamond",
    cssVar: "--font-face-cormorant",
    roles: ["sans", "heading"],
    fallback: SERIF_FALLBACK,
    features: '"liga", "lnum", "tnum"',
    note: "Refined old-world serif",
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
  "dm-mono": {
    id: "dm-mono",
    label: "DM Mono",
    cssVar: "--font-face-dm-mono",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Soft, precise mono",
  },
  "inconsolata": {
    id: "inconsolata",
    label: "Inconsolata",
    cssVar: "--font-face-inconsolata",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Friendly humanist mono",
  },
  "roboto-mono": {
    id: "roboto-mono",
    label: "Roboto Mono",
    cssVar: "--font-face-roboto-mono",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Neutral mechanical mono",
  },
  "fira-code": {
    id: "fira-code",
    label: "Fira Code",
    cssVar: "--font-face-fira-code",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Crisp coding figures",
  },
  "azeret-mono": {
    id: "azeret-mono",
    label: "Azeret Mono",
    cssVar: "--font-face-azeret-mono",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Wide geometric mono",
  },
  "source-code-pro": {
    id: "source-code-pro",
    label: "Source Code Pro",
    cssVar: "--font-face-source-code-pro",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Clean utility mono",
  },
  "ubuntu-mono": {
    id: "ubuntu-mono",
    label: "Ubuntu Mono",
    cssVar: "--font-face-ubuntu-mono",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Subtly mechanical mono",
  },
  "pt-mono": {
    id: "pt-mono",
    label: "PT Mono",
    cssVar: "--font-face-pt-mono",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Calm classic mono",
  },
  "red-hat-mono": {
    id: "red-hat-mono",
    label: "Red Hat Mono",
    cssVar: "--font-face-red-hat-mono",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Precise modern mono",
  },
  "space-mono": {
    id: "space-mono",
    label: "Space Mono",
    cssVar: "--font-face-space-mono",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Retro numeric mono",
  },
  "victor-mono": {
    id: "victor-mono",
    label: "Victor Mono",
    cssVar: "--font-face-victor-mono",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Narrow, distinct mono",
  },
  "martian-mono": {
    id: "martian-mono",
    label: "Martian Mono",
    cssVar: "--font-face-martian-mono",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Technical wide mono",
  },
  "cutive-mono": {
    id: "cutive-mono",
    label: "Cutive Mono",
    cssVar: "--font-face-cutive-mono",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Typewriter mono",
  },
  "oxygen-mono": {
    id: "oxygen-mono",
    label: "Oxygen Mono",
    cssVar: "--font-face-oxygen-mono",
    roles: ["mono"],
    fallback: MONO_FALLBACK,
    features: '"liga"',
    note: "Disciplined plain mono",
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
  sans: "space-grotesk",
  heading: "space-grotesk",
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

/**
 * The face used for all app text: the theme's display (heading) font, so a
 * theme's typography shows everywhere rather than on headings alone.
 */
export function themeUiFont(fonts?: Partial<ThemeFonts> | null): FontId {
  return resolveThemeFonts(fonts).heading;
}

/** CSS custom properties the app reads (see globals.css). */
export function themeFontVariables(
  fonts?: Partial<ThemeFonts> | null,
): Record<string, string> {
  const resolved = resolveThemeFonts(fonts);
  const ui = themeUiFont(fonts);
  return {
    "--font-app-sans": fontStack(ui),
    "--font-app-heading": fontStack(ui),
    "--font-geist-mono": fontStack(resolved.mono),
    "--font-app-features": FONT_OPTIONS[ui].features,
  };
}

export function describeFonts(fonts?: Partial<ThemeFonts> | null): string {
  const resolved = resolveThemeFonts(fonts);
  const ui = FONT_OPTIONS[themeUiFont(fonts)].label;
  const mono = FONT_OPTIONS[resolved.mono].label;
  return `${ui} · ${mono}`;
}

/** Named pairings offered for custom themes. */
export const FONT_PAIRINGS: Array<{
  id: string;
  label: string;
  fonts: Required<ThemeFonts>;
}> = [
  { id: "nocturne", label: "Space Grotesk + JetBrains Mono", fonts: { sans: "space-grotesk", heading: "space-grotesk", mono: "jetbrains-mono" } },
  { id: "vercel-light", label: "Inter + IBM Plex Mono", fonts: { sans: "inter", heading: "inter", mono: "plex-mono" } },
  { id: "vercel-dark", label: "Geist + Geist Mono", fonts: { sans: "geist", heading: "geist", mono: "geist-mono" } },
  { id: "ocean", label: "Manrope + DM Mono", fonts: { sans: "manrope", heading: "manrope", mono: "dm-mono" } },
  { id: "forest", label: "Newsreader + Inconsolata", fonts: { sans: "newsreader", heading: "newsreader", mono: "inconsolata" } },
  { id: "sunset", label: "Outfit + Roboto Mono", fonts: { sans: "outfit", heading: "outfit", mono: "roboto-mono" } },
  { id: "rose", label: "Fraunces + Fira Code", fonts: { sans: "fraunces", heading: "fraunces", mono: "fira-code" } },
  { id: "lavender", label: "Sora + Azeret Mono", fonts: { sans: "sora", heading: "sora", mono: "azeret-mono" } },
  { id: "slate", label: "IBM Plex Sans + Source Code Pro", fonts: { sans: "plex-sans", heading: "plex-sans", mono: "source-code-pro" } },
  { id: "sand", label: "Lora + Ubuntu Mono", fonts: { sans: "lora", heading: "lora", mono: "ubuntu-mono" } },
  { id: "nord", label: "Plus Jakarta Sans + PT Mono", fonts: { sans: "jakarta", heading: "jakarta", mono: "pt-mono" } },
  { id: "coffee", label: "Merriweather + Red Hat Mono", fonts: { sans: "merriweather", heading: "merriweather", mono: "red-hat-mono" } },
  { id: "mint", label: "DM Sans + Space Mono", fonts: { sans: "dm-sans", heading: "dm-sans", mono: "space-mono" } },
  { id: "charcoal", label: "Space Grotesk + JetBrains Mono (Geist body)", fonts: { sans: "geist", heading: "space-grotesk", mono: "jetbrains-mono" } },
  { id: "high-contrast", label: "Atkinson Hyperlegible + Victor Mono", fonts: { sans: "atkinson", heading: "atkinson", mono: "victor-mono" } },
  { id: "emerald", label: "Bodoni Moda + Martian Mono", fonts: { sans: "bodoni", heading: "bodoni", mono: "martian-mono" } },
  { id: "bronze", label: "Cormorant Garamond + Cutive Mono", fonts: { sans: "cormorant", heading: "cormorant", mono: "cutive-mono" } },
  { id: "ruby", label: "Archivo + Oxygen Mono", fonts: { sans: "archivo", heading: "archivo", mono: "oxygen-mono" } },
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
