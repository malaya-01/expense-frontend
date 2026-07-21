"use client";

import { useLayoutEffect } from "react";
import { applyTheme, readStoredTheme } from "./theme";

/** Re-syncs theme after hydration / navigation */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme(readStoredTheme());
  }, []);

  return null;
}
