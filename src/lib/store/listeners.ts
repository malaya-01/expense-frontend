import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { applyTheme } from "@/lib/themes/apply";
import {
  applyStoredThemeFromBrowser,
  readStoredThemeSnapshot,
} from "@/lib/themes/bootstrap";
import {
  writeActiveThemeId,
  writeCustomThemes,
} from "@/lib/themes/storage";
import { clearTokens, getAccessToken } from "@/lib/api/client";
import {
  hydrateAuth,
  logout,
  setSession,
  USER_STORAGE_KEY,
} from "./slices/authSlice";
import {
  createTheme,
  deleteTheme,
  duplicateTheme,
  hydrateTheme,
  selectActiveTheme,
  setThemeId,
  updateTheme,
} from "./slices/themeSlice";
import {
  DEFAULT_SIDEBAR_WIDTH,
  dismissToast,
  hydrateSidebar,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  setSidebarPinned,
  setSidebarWidth,
  showToast,
  SIDEBAR_PINNED_KEY,
  SIDEBAR_WIDTH_KEY,
  toggleSidebarPinned,
} from "./slices/uiSlice";
import {
  dismissAllNotifications,
  DISMISSED_NOTIFICATIONS_KEY,
  hydrateDismissed,
} from "./slices/notificationsSlice";
import type { AppDispatch, RootState } from "./index";

export const listenerMiddleware = createListenerMiddleware();
const startAppListening = listenerMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>();

function syncSidebarOffset(pinned: boolean, width: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(
    "--app-sidebar-offset",
    pinned ? `${width}px` : "0px",
  );
}

export function bootstrapAppState(dispatch: AppDispatch) {
  const token = getAccessToken();
  let storedUser = null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    storedUser = raw ? JSON.parse(raw) : null;
  } catch {
    storedUser = null;
  }
  if (token && storedUser) {
    dispatch(hydrateAuth({ user: storedUser, hasAccessToken: true }));
  } else {
    if (!token) localStorage.removeItem(USER_STORAGE_KEY);
    dispatch(hydrateAuth({ user: null, hasAccessToken: Boolean(token) }));
  }

  applyStoredThemeFromBrowser();
  const themeSnapshot = readStoredThemeSnapshot();
  dispatch(hydrateTheme(themeSnapshot));

  const savedPinned = localStorage.getItem(SIDEBAR_PINNED_KEY) !== "false";
  const savedWidth = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
  const nextWidth = Number.isFinite(savedWidth)
    ? Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, savedWidth))
    : DEFAULT_SIDEBAR_WIDTH;
  dispatch(hydrateSidebar({ pinned: savedPinned, width: nextWidth }));
  syncSidebarOffset(savedPinned, nextWidth);

  try {
    const dismissed = JSON.parse(
      localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY) || "[]",
    ) as string[];
    dispatch(hydrateDismissed(Array.isArray(dismissed) ? dismissed : []));
  } catch {
    dispatch(hydrateDismissed([]));
  }
}

startAppListening({
  actionCreator: setSession,
  effect: (action) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(action.payload));
  },
});

startAppListening({
  actionCreator: logout,
  effect: () => {
    clearTokens();
    localStorage.removeItem(USER_STORAGE_KEY);
  },
});

startAppListening({
  matcher: isAnyOf(
    hydrateTheme,
    setThemeId,
    createTheme,
    updateTheme,
    deleteTheme,
    duplicateTheme,
  ),
  effect: (_action, api) => {
    const state = api.getState();
    const active = selectActiveTheme(state);
    writeActiveThemeId(state.theme.activeThemeId);
    writeCustomThemes(state.theme.customThemes);
    applyTheme(active);
  },
});

startAppListening({
  matcher: isAnyOf(
    hydrateSidebar,
    setSidebarPinned,
    toggleSidebarPinned,
    setSidebarWidth,
  ),
  effect: (_action, api) => {
    const { sidebarPinned, sidebarWidth, sidebarHydrated } = api.getState().ui;
    if (!sidebarHydrated && _action.type !== hydrateSidebar.type) return;
    localStorage.setItem(SIDEBAR_PINNED_KEY, String(sidebarPinned));
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    syncSidebarOffset(sidebarPinned, sidebarWidth);
  },
});

startAppListening({
  actionCreator: dismissAllNotifications,
  effect: (_action, api) => {
    localStorage.setItem(
      DISMISSED_NOTIFICATIONS_KEY,
      JSON.stringify(api.getState().notifications.dismissed),
    );
  },
});

startAppListening({
  actionCreator: showToast,
  effect: async (action, api) => {
    const toast = api.getState().ui.toasts.at(-1);
    if (!toast) return;
    const timeout =
      action.payload.duration ??
      (action.payload.tone === "error" ? 7000 : 4500);
    await api.delay(timeout);
    api.dispatch(dismissToast(toast.id));
  },
});
