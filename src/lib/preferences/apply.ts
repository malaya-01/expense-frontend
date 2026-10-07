import { configureFormatting } from "@/lib/format";
import type { User } from "@/types";
import type { UserPreferences } from "./types";

/**
 * Appearance preferences live on <html> so CSS (globals.css) can react:
 *   data-density="compact"   → tighter Tailwind spacing scale
 *   data-reduce-motion       → animations / transitions off
 *   --app-font-scale         → root font size (rem-based text + spacing)
 * The pre-paint bootstrap script (themes/bootstrap.ts) does the same from
 * localStorage before React loads.
 */
export function applyAppearancePreferences(
  prefs: Pick<UserPreferences, "density" | "reduce_motion" | "font_scale">,
  root: HTMLElement = document.documentElement,
) {
  root.dataset.density = prefs.density;
  if (prefs.reduce_motion) root.dataset.reduceMotion = "true";
  else delete root.dataset.reduceMotion;
  root.style.setProperty("--app-font-scale", String(prefs.font_scale / 100));
}

/** Push regional + formatting preferences into the shared format helpers. */
export function applyFormattingPreferences(
  prefs: Pick<UserPreferences, "date_format" | "number_format" | "week_start">,
  user?: Pick<User, "locale" | "timezone"> | null,
) {
  configureFormatting({
    locale: user?.locale || undefined,
    // "UTC" is the column default for accounts that never picked a zone;
    // treat it as unset so timestamps show in the device's local time.
    timeZone:
      user?.timezone && user.timezone !== "UTC" ? user.timezone : undefined,
    dateFormat: prefs.date_format,
    numberFormat: prefs.number_format,
    weekStart: prefs.week_start,
  });
}

export function applyAllPreferences(
  prefs: UserPreferences,
  user?: Pick<User, "locale" | "timezone"> | null,
) {
  if (typeof document !== "undefined") applyAppearancePreferences(prefs);
  applyFormattingPreferences(prefs, user);
}
