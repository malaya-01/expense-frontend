import { isAnyOf, type TypedStartListening } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@/lib/store";
import {
  hydrateAuth,
  logout,
  setSession,
} from "@/lib/store/slices/authSlice";
import { applyAllPreferences, applyFormattingPreferences } from "./apply";
import {
  hydratePreferences,
  resetPreferences,
  setPreferences,
} from "./slice";
import {
  clearStoredPreferences,
  readStoredPreferences,
  writeStoredPreferences,
} from "./storage";
import { syncPreferencesFromBackend } from "./sync";

type StartListening = TypedStartListening<RootState, AppDispatch>;

/** Load cached preferences at startup (before any network request). */
export function bootstrapPreferences(dispatch: AppDispatch) {
  dispatch(hydratePreferences(readStoredPreferences()));
}

export function registerPreferenceListeners(startListening: StartListening) {
  // Cache + apply whenever preferences change.
  startListening({
    matcher: isAnyOf(hydratePreferences, setPreferences, resetPreferences),
    effect: (action, api) => {
      const state = api.getState();
      if (action.type === resetPreferences.type) clearStoredPreferences();
      else writeStoredPreferences(state.preferences.values);
      applyAllPreferences(state.preferences.values, state.auth.user);
    },
  });

  // Locale / timezone live on the user profile: re-apply when it changes,
  // then refresh preferences from the server.
  startListening({
    matcher: isAnyOf(hydrateAuth, setSession),
    effect: (action, api) => {
      const state = api.getState();
      applyFormattingPreferences(state.preferences.values, state.auth.user);
      if (hydrateAuth.match(action)) {
        if (!action.payload.user || !action.payload.hasAccessToken) return;
      }
      void syncPreferencesFromBackend(api.dispatch, api.getState);
    },
  });

  // Next account on this device starts from defaults.
  startListening({
    actionCreator: logout,
    effect: (_action, api) => {
      api.dispatch(resetPreferences());
    },
  });
}
