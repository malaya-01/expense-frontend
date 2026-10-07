import type { ThemeFonts } from "./fonts";

export type { ThemeFonts } from "./fonts";

export type ThemeTokens = {
  background100: string;
  background200: string;
  backgroundElevated: string;
  gray100: string;
  gray1000: string;
  gray900: string;
  gray700: string;
  focusColor: string;
  /** Readable accent for inline / help links (may differ from focus on neutral themes). */
  linkColor: string;
  linkHover: string;
  focusInput: string;
  focusRingInner: string;
  primaryHover: string;
  primaryForeground: string;
  dangerHover: string;
  shadowAlpha: string;
  headerBorderAlpha: string;
  selectionAlpha: string;
};

export type ThemeDefinition = {
  id: string;
  name: string;
  description?: string;
  tokens: ThemeTokens;
  /** Font pairing; missing on older custom themes (defaults apply). */
  fonts?: ThemeFonts;
  builtin?: boolean;
};

export type CustomThemeInput = {
  name: string;
  background100: string;
  backgroundElevated: string;
  gray1000: string;
  gray900: string;
  focusColor: string;
  fonts?: ThemeFonts;
};

export const THEME_STORAGE_KEY = "expense-tracker:active-theme-id";
export const CUSTOM_THEMES_KEY = "expense-tracker:custom-themes";
