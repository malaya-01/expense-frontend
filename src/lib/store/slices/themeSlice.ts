import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { PRESET_THEMES } from "@/lib/themes/presets";
import type { CustomThemeInput, ThemeDefinition } from "@/lib/themes/types";
import { createCustomTheme } from "@/lib/themes/utils";

export type ThemeState = {
  ready: boolean;
  activeThemeId: string;
  customThemes: ThemeDefinition[];
};

const initialState: ThemeState = {
  ready: false,
  activeThemeId: PRESET_THEMES[0].id,
  customThemes: [],
};

export function resolveTheme(
  id: string,
  customThemes: ThemeDefinition[],
): ThemeDefinition {
  const preset = PRESET_THEMES.find((theme) => theme.id === id);
  if (preset) return preset;
  const custom = customThemes.find((theme) => theme.id === id);
  if (custom) return custom;
  return PRESET_THEMES[0];
}

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    hydrateTheme(
      state,
      action: PayloadAction<{
        activeThemeId: string;
        customThemes: ThemeDefinition[];
      }>,
    ) {
      state.activeThemeId = action.payload.activeThemeId;
      state.customThemes = action.payload.customThemes;
      state.ready = true;
    },
    setThemeId(state, action: PayloadAction<string>) {
      const theme = resolveTheme(action.payload, state.customThemes);
      state.activeThemeId = theme.id;
    },
    createTheme: {
      reducer(state, action: PayloadAction<ThemeDefinition>) {
        state.customThemes.push(action.payload);
        state.activeThemeId = action.payload.id;
      },
      prepare(input: CustomThemeInput) {
        return { payload: createCustomTheme(input) };
      },
    },
    updateTheme(
      state,
      action: PayloadAction<{ id: string; input: CustomThemeInput }>,
    ) {
      state.customThemes = state.customThemes.map((theme) =>
        theme.id === action.payload.id
          ? createCustomTheme(action.payload.input, action.payload.id)
          : theme,
      );
    },
    deleteTheme(state, action: PayloadAction<string>) {
      state.customThemes = state.customThemes.filter(
        (theme) => theme.id !== action.payload,
      );
      if (state.activeThemeId === action.payload) {
        state.activeThemeId = PRESET_THEMES[0].id;
      }
    },
    duplicateTheme: {
      reducer(state, action: PayloadAction<ThemeDefinition>) {
        state.customThemes.push(action.payload);
      },
      prepare(source: ThemeDefinition) {
        return {
          payload: createCustomTheme({
            name: `${source.name} copy`,
            background100: source.tokens.background100,
            backgroundElevated: source.tokens.backgroundElevated,
            gray1000: source.tokens.gray1000,
            gray900: source.tokens.gray900,
            focusColor: source.tokens.focusColor,
          }),
        };
      },
    },
  },
});

export const {
  hydrateTheme,
  setThemeId,
  createTheme,
  updateTheme,
  deleteTheme,
  duplicateTheme,
} = themeSlice.actions;
export default themeSlice.reducer;

export const selectActiveTheme = createSelector(
  [
    (state: { theme: ThemeState }) => state.theme.activeThemeId,
    (state: { theme: ThemeState }) => state.theme.customThemes,
  ],
  resolveTheme,
);

export const selectAllThemes = createSelector(
  [(state: { theme: ThemeState }) => state.theme.customThemes],
  (customThemes) => [...PRESET_THEMES, ...customThemes],
);
