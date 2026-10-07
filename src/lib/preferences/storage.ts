import {
  DEFAULT_PREFERENCES,
  PREFERENCES_PENDING_KEY,
  PREFERENCES_STORAGE_KEY,
  normalizePreferences,
  type UserPreferences,
} from "./types";

export function readStoredPreferences(): UserPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFERENCES };
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return normalizePreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function writeStoredPreferences(prefs: UserPreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage full / disabled: in-memory prefs still apply */
  }
}

export function clearStoredPreferences() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    localStorage.removeItem(PREFERENCES_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function hasPendingPreferences(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PREFERENCES_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPendingPreferences(pending: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (pending) localStorage.setItem(PREFERENCES_PENDING_KEY, "1");
    else localStorage.removeItem(PREFERENCES_PENDING_KEY);
  } catch {
    /* ignore */
  }
}
