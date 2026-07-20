import type { ThemeDefinition } from "./types";
import { CUSTOM_THEMES_KEY, THEME_STORAGE_KEY } from "./types";
import { DEFAULT_THEME_ID } from "./presets";

export function readActiveThemeId(): string {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME_ID;
}

export function writeActiveThemeId(id: string) {
  localStorage.setItem(THEME_STORAGE_KEY, id);
}

export function readCustomThemes(): ThemeDefinition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ThemeDefinition[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCustomThemes(themes: ThemeDefinition[]) {
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
}
