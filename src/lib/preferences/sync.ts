import type { AppDispatch, RootState } from "@/lib/store";
import { getAccessToken } from "@/lib/api/client";
import { getPreferences, savePreferences } from "@/lib/api/user";
import { isOnline } from "@/lib/offline/network";
import { hydratePreferences } from "./slice";
import { hasPendingPreferences, setPendingPreferences } from "./storage";
import type { UserPreferences } from "./types";

let syncInFlight = false;

/**
 * After sign-in / app start: pull preferences from the server. If a change
 * was made offline and never confirmed, push the local copy instead so the
 * offline edit is not overwritten by stale server data.
 */
export async function syncPreferencesFromBackend(
  dispatch: AppDispatch,
  getState: () => RootState,
) {
  if (!getAccessToken() || !isOnline() || syncInFlight) return;
  const userId = getState().auth.user?.id;
  if (!userId) return;
  syncInFlight = true;
  try {
    if (hasPendingPreferences()) {
      const local = getState().preferences.values;
      const result = await savePreferences(userId, local);
      if (!result.queued) setPendingPreferences(false);
      return;
    }
    const remote = await getPreferences();
    dispatch(hydratePreferences(remote.preferences as Partial<UserPreferences>));
  } catch {
    /* keep the cached preferences when the API is unavailable */
  } finally {
    syncInFlight = false;
  }
}

/**
 * Persist the full preference object. Resolves with `queued: true` when it
 * was stored offline for the sync engine to push later.
 */
export async function persistPreferences(
  userId: string,
  prefs: UserPreferences,
): Promise<{ queued: boolean }> {
  const result = await savePreferences(userId, prefs);
  setPendingPreferences(result.queued);
  return { queued: result.queued };
}
