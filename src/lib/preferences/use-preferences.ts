"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/store/hooks";
import { hydratePreferences, selectPreferences, setPreferences } from "./slice";
import { persistPreferences } from "./sync";
import { normalizePreferences, type UserPreferences } from "./types";

/**
 * Read and change app preferences.
 *  - `apply(patch)`: change locally right away (cached + applied, not saved).
 *  - `save(patch)`: merge, persist to the server (or offline queue), apply.
 */
export function usePreferences() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const prefs = useAppSelector(selectPreferences);

  const apply = useCallback(
    (patch: Partial<UserPreferences>) => {
      dispatch(setPreferences(patch));
    },
    [dispatch],
  );

  const save = useCallback(
    async (patch: Partial<UserPreferences> = {}) => {
      const state = store.getState();
      const userId = state.auth.user?.id;
      if (!userId) throw new Error("You are signed out. Sign in again.");
      const next = normalizePreferences({
        ...state.preferences.values,
        ...patch,
      });
      const result = await persistPreferences(userId, next);
      dispatch(hydratePreferences(next));
      return result;
    },
    [dispatch, store],
  );

  return { prefs, apply, save };
}
