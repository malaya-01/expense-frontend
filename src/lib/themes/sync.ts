import type { AppDispatch, RootState } from "@/lib/store";
import {
  getThemePreferences,
  saveThemePreferences,
} from "@/lib/api/user";
import { isOnline } from "@/lib/offline/network";
import type { ThemeDefinition } from "@/lib/themes/types";
import { hydrateTheme } from "@/lib/store/slices/themeSlice";
import { getAccessToken } from "@/lib/api/client";

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;

function asCustomThemes(value: unknown): ThemeDefinition[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ThemeDefinition =>
      Boolean(
        item &&
          typeof item === "object" &&
          typeof (item as ThemeDefinition).id === "string" &&
          typeof (item as ThemeDefinition).name === "string" &&
          (item as ThemeDefinition).tokens &&
          typeof (item as ThemeDefinition).tokens === "object",
      ),
  );
}

/** Pull theme from backend after login; push local if server has none yet. */
export async function syncThemeFromBackend(dispatch: AppDispatch, getState: () => RootState) {
  if (!getAccessToken() || !isOnline() || syncInFlight) return;
  syncInFlight = true;
  try {
    const remote = await getThemePreferences();
    const local = getState().theme;
    if (remote.has_preference && remote.active_theme_id) {
      dispatch(
        hydrateTheme({
          activeThemeId: remote.active_theme_id,
          customThemes: asCustomThemes(remote.custom_themes),
        }),
      );
      return;
    }
    // First time: seed backend from whatever the user already picked locally.
    await saveThemePreferences({
      active_theme_id: local.activeThemeId,
      custom_themes: local.customThemes,
    });
  } catch {
    /* keep local theme if the API is unavailable */
  } finally {
    syncInFlight = false;
  }
}

/** Debounced push of the active theme to the backend. */
export function scheduleThemeSaveToBackend(getState: () => RootState) {
  if (!getAccessToken() || !isOnline()) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const state = getState().theme;
    void saveThemePreferences({
      active_theme_id: state.activeThemeId,
      custom_themes: state.customThemes,
    }).catch(() => undefined);
  }, 450);
}
