import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  DEFAULT_PREFERENCES,
  normalizePreferences,
  type UserPreferences,
} from "./types";

export type PreferencesState = {
  ready: boolean;
  values: UserPreferences;
};

const initialState: PreferencesState = {
  ready: false,
  values: { ...DEFAULT_PREFERENCES },
};

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    /** Replace from storage / server (not echoed back to the server). */
    hydratePreferences(state, action: PayloadAction<Partial<UserPreferences>>) {
      state.values = normalizePreferences(action.payload);
      state.ready = true;
    },
    /** Local change made by the user. */
    setPreferences(state, action: PayloadAction<Partial<UserPreferences>>) {
      state.values = normalizePreferences({
        ...state.values,
        ...action.payload,
      });
    },
    resetPreferences(state) {
      state.values = { ...DEFAULT_PREFERENCES };
    },
  },
});

export const { hydratePreferences, setPreferences, resetPreferences } =
  preferencesSlice.actions;
export default preferencesSlice.reducer;

export function selectPreferences(state: { preferences: PreferencesState }) {
  return state.preferences.values;
}
