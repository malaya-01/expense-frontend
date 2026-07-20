"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyTheme } from "@/lib/themes/apply";
import {
  applyStoredThemeFromBrowser,
  readStoredThemeSnapshot,
} from "@/lib/themes/bootstrap";
import { PRESET_THEMES, getPresetById } from "@/lib/themes/presets";
import {
  writeActiveThemeId,
  writeCustomThemes,
} from "@/lib/themes/storage";
import type { CustomThemeInput, ThemeDefinition } from "@/lib/themes/types";
import { createCustomTheme } from "@/lib/themes/utils";

type ThemeState = {
  ready: boolean;
  activeThemeId: string;
  activeTheme: ThemeDefinition;
  presetThemes: ThemeDefinition[];
  customThemes: ThemeDefinition[];
  allThemes: ThemeDefinition[];
  setTheme: (id: string) => void;
  createTheme: (input: CustomThemeInput) => ThemeDefinition;
  updateTheme: (id: string, input: CustomThemeInput) => void;
  deleteTheme: (id: string) => void;
  duplicateTheme: (id: string) => ThemeDefinition | null;
};

const ThemeContext = createContext<ThemeState | null>(null);

function resolveTheme(
  id: string,
  customThemes: ThemeDefinition[],
): ThemeDefinition {
  const preset = getPresetById(id);
  if (preset) return preset;
  const custom = customThemes.find((t) => t.id === id);
  if (custom) return custom;
  return PRESET_THEMES[0];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  // Important: do not read localStorage during the initial render.
  // Next can pre-render Client Components on the server; reading localStorage
  // would cause SSR (default theme) vs first client render (stored theme) mismatch.
  const [activeThemeId, setActiveThemeId] = useState(PRESET_THEMES[0].id);
  const [customThemes, setCustomThemes] = useState<ThemeDefinition[]>([]);

  useLayoutEffect(() => {
    applyStoredThemeFromBrowser();
    const snapshot = readStoredThemeSnapshot();
    setActiveThemeId(snapshot.activeThemeId);
    setCustomThemes(snapshot.customThemes);
    setReady(true);
  }, []);

  const setTheme = useCallback(
    (id: string) => {
      const theme = resolveTheme(id, customThemes);
      setActiveThemeId(theme.id);
      writeActiveThemeId(theme.id);
      applyTheme(theme);
    },
    [customThemes],
  );

  const persistCustom = useCallback((themes: ThemeDefinition[]) => {
    setCustomThemes(themes);
    writeCustomThemes(themes);
  }, []);

  const createTheme = useCallback(
    (input: CustomThemeInput) => {
      const theme = createCustomTheme(input);
      const next = [...customThemes, theme];
      persistCustom(next);
      setTheme(theme.id);
      return theme;
    },
    [customThemes, persistCustom, setTheme],
  );

  const updateTheme = useCallback(
    (id: string, input: CustomThemeInput) => {
      const next = customThemes.map((t) =>
        t.id === id ? createCustomTheme(input, id) : t,
      );
      persistCustom(next);
      if (activeThemeId === id) {
        const updated = next.find((t) => t.id === id);
        if (updated) applyTheme(updated);
      }
    },
    [activeThemeId, customThemes, persistCustom],
  );

  const deleteTheme = useCallback(
    (id: string) => {
      const next = customThemes.filter((t) => t.id !== id);
      persistCustom(next);
      if (activeThemeId === id) {
        const fallback = PRESET_THEMES[0];
        setActiveThemeId(fallback.id);
        writeActiveThemeId(fallback.id);
        applyTheme(fallback);
      }
    },
    [activeThemeId, customThemes, persistCustom],
  );

  const duplicateTheme = useCallback(
    (id: string) => {
      const source = resolveTheme(id, customThemes);
      const copy = createCustomTheme(
        {
          name: `${source.name} copy`,
          background100: source.tokens.background100,
          backgroundElevated: source.tokens.backgroundElevated,
          gray1000: source.tokens.gray1000,
          gray900: source.tokens.gray900,
          focusColor: source.tokens.focusColor,
        },
      );
      persistCustom([...customThemes, copy]);
      return copy;
    },
    [customThemes, persistCustom],
  );

  const activeTheme = useMemo(
    () => resolveTheme(activeThemeId, customThemes),
    [activeThemeId, customThemes],
  );

  const value = useMemo(
    () => ({
      ready,
      activeThemeId,
      activeTheme,
      presetThemes: PRESET_THEMES,
      customThemes,
      allThemes: [...PRESET_THEMES, ...customThemes],
      setTheme,
      createTheme,
      updateTheme,
      deleteTheme,
      duplicateTheme,
    }),
    [
      ready,
      activeThemeId,
      activeTheme,
      customThemes,
      setTheme,
      createTheme,
      updateTheme,
      deleteTheme,
      duplicateTheme,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
