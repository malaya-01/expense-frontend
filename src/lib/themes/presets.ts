import type { ThemeDefinition } from "./types";
import { buildTokens } from "./utils";

function preset(
  id: string,
  name: string,
  description: string,
  colors: Parameters<typeof buildTokens>[0],
): ThemeDefinition {
  return {
    id: `preset:${id}`,
    name,
    description,
    builtin: true,
    tokens: buildTokens(colors),
  };
}

export const PRESET_THEMES: ThemeDefinition[] = [
  preset("vercel-light", "Vercel Light", "Default achromatic canvas", {
    background100: "#fafafa",
    backgroundElevated: "#ffffff",
    gray1000: "#171717",
    gray900: "#4d4d4d",
    focusColor: "#0072f5",
  }),
  preset("vercel-dark", "Vercel Dark", "Low-light engineering UI", {
    background100: "#0a0a0a",
    backgroundElevated: "#171717",
    gray1000: "#ededed",
    gray900: "#a1a1a1",
    focusColor: "#3291ff",
  }),
  preset("midnight", "Midnight", "Deep blue night mode", {
    background100: "#0b1220",
    backgroundElevated: "#111a2e",
    gray1000: "#e8eefc",
    gray900: "#9aa8c7",
    focusColor: "#5b8def",
  }),
  preset("ocean", "Ocean", "Cool teal waters", {
    background100: "#f0f9fb",
    backgroundElevated: "#ffffff",
    gray1000: "#0f2d3a",
    gray900: "#3d6573",
    focusColor: "#0891b2",
  }),
  preset("forest", "Forest", "Muted greens and earth", {
    background100: "#f3f7f2",
    backgroundElevated: "#ffffff",
    gray1000: "#1a2e1f",
    gray900: "#4a5f4e",
    focusColor: "#2f855a",
  }),
  preset("sunset", "Sunset", "Warm amber glow", {
    background100: "#fff8f1",
    backgroundElevated: "#ffffff",
    gray1000: "#3b2214",
    gray900: "#7a5642",
    focusColor: "#ea580c",
  }),
  preset("rose", "Rose", "Soft pink accents", {
    background100: "#fff5f7",
    backgroundElevated: "#ffffff",
    gray1000: "#3f1d2b",
    gray900: "#7a4a5c",
    focusColor: "#e11d48",
  }),
  preset("lavender", "Lavender", "Calm purple tones", {
    background100: "#f7f4ff",
    backgroundElevated: "#ffffff",
    gray1000: "#2a1f3d",
    gray900: "#6b5b8a",
    focusColor: "#7c3aed",
  }),
  preset("slate", "Slate", "Cool gray professional", {
    background100: "#f1f5f9",
    backgroundElevated: "#ffffff",
    gray1000: "#0f172a",
    gray900: "#475569",
    focusColor: "#2563eb",
  }),
  preset("sand", "Warm Sand", "Paper-like neutrals", {
    background100: "#f8f4ec",
    backgroundElevated: "#fffdf8",
    gray1000: "#2c2418",
    gray900: "#6b5f4f",
    focusColor: "#b45309",
  }),
  preset("nord", "Nord", "Arctic palette", {
    background100: "#eceff4",
    backgroundElevated: "#ffffff",
    gray1000: "#2e3440",
    gray900: "#4c566a",
    focusColor: "#5e81ac",
  }),
  preset("coffee", "Coffee", "Rich brown comfort", {
    background100: "#f5efe8",
    backgroundElevated: "#fffaf5",
    gray1000: "#2b1d14",
    gray900: "#6b4f3f",
    focusColor: "#92400e",
  }),
  preset("mint", "Mint", "Fresh green highlight", {
    background100: "#f0fdf8",
    backgroundElevated: "#ffffff",
    gray1000: "#0f2922",
    gray900: "#3f6b5c",
    focusColor: "#059669",
  }),
  preset("charcoal", "Charcoal", "Neutral dark gray", {
    background100: "#141414",
    backgroundElevated: "#1f1f1f",
    gray1000: "#f5f5f5",
    gray900: "#b3b3b3",
    focusColor: "#a3a3a3",
  }),
  preset("high-contrast", "High Contrast", "Maximum readability", {
    background100: "#ffffff",
    backgroundElevated: "#ffffff",
    gray1000: "#000000",
    gray900: "#1a1a1a",
    focusColor: "#0000ee",
    gray700: "#333333",
    focusInput: "#0000cc",
  }),
];

export const DEFAULT_THEME_ID = PRESET_THEMES[0].id;

export function getPresetById(id: string): ThemeDefinition | undefined {
  return PRESET_THEMES.find((t) => t.id === id);
}
