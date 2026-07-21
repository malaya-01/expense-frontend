"use client";

import { useCallback } from "react";
import { PRESET_THEMES } from "@/lib/themes/presets";
import type { CustomThemeInput, ThemeDefinition } from "@/lib/themes/types";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  createTheme as createThemeAction,
  deleteTheme as deleteThemeAction,
  duplicateTheme as duplicateThemeAction,
  resolveTheme,
  selectActiveTheme,
  selectAllThemes,
  setThemeId,
  updateTheme as updateThemeAction,
} from "@/lib/store/slices/themeSlice";

export function useTheme() {
  const dispatch = useAppDispatch();
  const ready = useAppSelector((state) => state.theme.ready);
  const activeThemeId = useAppSelector((state) => state.theme.activeThemeId);
  const customThemes = useAppSelector((state) => state.theme.customThemes);
  const activeTheme = useAppSelector(selectActiveTheme);
  const allThemes = useAppSelector(selectAllThemes);

  const setTheme = useCallback(
    (id: string) => {
      dispatch(setThemeId(id));
    },
    [dispatch],
  );

  const createTheme = useCallback(
    (input: CustomThemeInput): ThemeDefinition => {
      const action = createThemeAction(input);
      dispatch(action);
      return action.payload;
    },
    [dispatch],
  );

  const updateTheme = useCallback(
    (id: string, input: CustomThemeInput) => {
      dispatch(updateThemeAction({ id, input }));
    },
    [dispatch],
  );

  const deleteTheme = useCallback(
    (id: string) => {
      dispatch(deleteThemeAction(id));
    },
    [dispatch],
  );

  const duplicateTheme = useCallback(
    (id: string): ThemeDefinition | null => {
      const source = resolveTheme(id, customThemes);
      if (!source) return null;
      const action = duplicateThemeAction(source);
      dispatch(action);
      return action.payload;
    },
    [customThemes, dispatch],
  );

  return {
    ready,
    activeThemeId,
    activeTheme,
    presetThemes: PRESET_THEMES,
    customThemes,
    allThemes,
    setTheme,
    createTheme,
    updateTheme,
    deleteTheme,
    duplicateTheme,
  };
}
