import type { ThemeFonts } from "./fonts";
import type { ThemeDefinition } from "./types";
import { buildTokens } from "./utils";

function preset(
  id: string,
  name: string,
  description: string,
  colors: Parameters<typeof buildTokens>[0],
  fonts: ThemeFonts,
): ThemeDefinition {
  return {
    id: `preset:${id}`,
    name,
    description,
    builtin: true,
    tokens: buildTokens(colors),
    fonts: { ...fonts, heading: fonts.heading ?? fonts.sans },
  };
}

/**
 * Each preset carries its own font pairing (UI / heading / numeric mono).
 * Font ids resolve through ./fonts.ts to faces self-hosted by next/font.
 */
export const PRESET_THEMES: ThemeDefinition[] = [
  preset(
    "midnight",
    "Nocturne",
    "Violet–blue mesh on deep navy",
    {
      background100: "#0c0d12",
      backgroundElevated: "#161821",
      gray1000: "#f3f4f8",
      gray900: "#b0b4c4",
      focusColor: "#8b7cf7",
    },
    { sans: "space-grotesk", heading: "space-grotesk", mono: "jetbrains-mono" },
  ),
  preset(
    "vercel-light",
    "Vercel Light",
    "Default achromatic canvas",
    {
      background100: "#fafafa",
      backgroundElevated: "#ffffff",
      gray1000: "#171717",
      gray900: "#4d4d4d",
      focusColor: "#0072f5",
    },
    { sans: "inter", heading: "inter", mono: "plex-mono" },
  ),
  preset(
    "vercel-dark",
    "Vercel Dark",
    "Low-light engineering UI",
    {
      background100: "#0a0a0a",
      backgroundElevated: "#171717",
      gray1000: "#ededed",
      gray900: "#a1a1a1",
      focusColor: "#3291ff",
    },
    { sans: "geist", heading: "geist", mono: "geist-mono" },
  ),
  preset(
    "ocean",
    "Ocean",
    "Cool teal waters",
    {
      background100: "#f0f9fb",
      backgroundElevated: "#ffffff",
      gray1000: "#0f2d3a",
      gray900: "#3d6573",
      focusColor: "#0891b2",
    },
    { sans: "manrope", heading: "manrope", mono: "dm-mono" },
  ),
  preset(
    "forest",
    "Forest",
    "Muted greens and earth",
    {
      background100: "#f3f7f2",
      backgroundElevated: "#ffffff",
      gray1000: "#1a2e1f",
      gray900: "#4a5f4e",
      focusColor: "#2f855a",
    },
    { sans: "newsreader", heading: "newsreader", mono: "inconsolata" },
  ),
  preset(
    "sunset",
    "Sunset",
    "Warm amber glow",
    {
      background100: "#fff8f1",
      backgroundElevated: "#ffffff",
      gray1000: "#3b2214",
      gray900: "#7a5642",
      focusColor: "#ea580c",
    },
    { sans: "outfit", heading: "outfit", mono: "roboto-mono" },
  ),
  preset(
    "rose",
    "Rose",
    "Soft pink accents",
    {
      background100: "#fff5f7",
      backgroundElevated: "#ffffff",
      gray1000: "#3f1d2b",
      gray900: "#7a4a5c",
      focusColor: "#e11d48",
    },
    { sans: "fraunces", heading: "fraunces", mono: "fira-code" },
  ),
  preset(
    "lavender",
    "Lavender",
    "Calm purple tones",
    {
      background100: "#f7f4ff",
      backgroundElevated: "#ffffff",
      gray1000: "#2a1f3d",
      gray900: "#6b5b8a",
      focusColor: "#7c3aed",
    },
    { sans: "sora", heading: "sora", mono: "azeret-mono" },
  ),
  preset(
    "slate",
    "Slate",
    "Cool gray professional",
    {
      background100: "#f1f5f9",
      backgroundElevated: "#ffffff",
      gray1000: "#0f172a",
      gray900: "#475569",
      focusColor: "#2563eb",
    },
    { sans: "plex-sans", heading: "plex-sans", mono: "source-code-pro" },
  ),
  preset(
    "sand",
    "Warm Sand",
    "Paper-like neutrals",
    {
      background100: "#f8f4ec",
      backgroundElevated: "#fffdf8",
      gray1000: "#2c2418",
      gray900: "#6b5f4f",
      focusColor: "#b45309",
    },
    { sans: "lora", heading: "lora", mono: "ubuntu-mono" },
  ),
  preset(
    "nord",
    "Nord",
    "Arctic palette",
    {
      background100: "#eceff4",
      backgroundElevated: "#ffffff",
      gray1000: "#2e3440",
      gray900: "#4c566a",
      focusColor: "#5e81ac",
    },
    { sans: "jakarta", heading: "jakarta", mono: "pt-mono" },
  ),
  preset(
    "coffee",
    "Coffee",
    "Rich brown comfort",
    {
      background100: "#f5efe8",
      backgroundElevated: "#fffaf5",
      gray1000: "#2b1d14",
      gray900: "#6b4f3f",
      focusColor: "#92400e",
    },
    { sans: "merriweather", heading: "merriweather", mono: "red-hat-mono" },
  ),
  preset(
    "mint",
    "Mint",
    "Fresh green highlight",
    {
      background100: "#f0fdf8",
      backgroundElevated: "#ffffff",
      gray1000: "#0f2922",
      gray900: "#3f6b5c",
      focusColor: "#059669",
    },
    { sans: "dm-sans", heading: "dm-sans", mono: "space-mono" },
  ),
  preset(
    "charcoal",
    "Charcoal",
    "Neutral dark gray",
    {
      background100: "#141414",
      backgroundElevated: "#1f1f1f",
      gray1000: "#f5f5f5",
      gray900: "#b3b3b3",
      focusColor: "#a3a3a3",
    },
    { sans: "geist", heading: "space-grotesk", mono: "jetbrains-mono" },
  ),
  preset(
    "high-contrast",
    "High Contrast",
    "Maximum readability",
    {
      background100: "#ffffff",
      backgroundElevated: "#ffffff",
      gray1000: "#000000",
      gray900: "#1a1a1a",
      focusColor: "#0000ee",
      gray700: "#333333",
      focusInput: "#0000cc",
    },
    { sans: "atkinson", heading: "atkinson", mono: "victor-mono" },
  ),
  preset(
    "emerald",
    "Emerald",
    "Prosperity — rich jewel greens",
    {
      background100: "#08140f",
      backgroundElevated: "#0f2119",
      gray1000: "#eaf6ef",
      gray900: "#a5c4b5",
      focusColor: "#34d399",
    },
    { sans: "bodoni", heading: "bodoni", mono: "martian-mono" },
  ),
  preset(
    "bronze",
    "Bronze",
    "Heritage — bronze and copper on dark umber",
    {
      background100: "#15100b",
      backgroundElevated: "#211910",
      gray1000: "#f6ece1",
      gray900: "#c4ad96",
      focusColor: "#d4934e",
    },
    { sans: "cormorant", heading: "cormorant", mono: "cutive-mono" },
  ),
  preset(
    "ruby",
    "Ruby",
    "Bold — deep ruby on red-black",
    {
      background100: "#14090c",
      backgroundElevated: "#211015",
      gray1000: "#fbedf0",
      gray900: "#caa2ad",
      focusColor: "#e3477a",
    },
    { sans: "archivo", heading: "archivo", mono: "oxygen-mono" },
  ),
];

export const DEFAULT_THEME_ID = PRESET_THEMES[0].id;

export function getPresetById(id: string): ThemeDefinition | undefined {
  return PRESET_THEMES.find((t) => t.id === id);
}
