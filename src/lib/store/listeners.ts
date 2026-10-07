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
import { setActiveOfflineUserId } from "@/lib/offline/clear-session";
import {
  hydrateAuth,
  logout,
  sessionExpired,
  setSession,
  updatePermissions,
  USER_STORAGE_KEY,
} from "./slices/authSlice";
import { DEFAULT_THEME_ID, PRESET_THEMES } from "@/lib/themes/presets";
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
  cancelPendingThemeSave,
  scheduleThemeSaveToBackend,
  syncThemeFromBackend,
} from "@/lib/themes/sync";
import {
  DEFAULT_SIDEBAR_WIDTH,
  dismissToast,
  hydrateSidebar,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  resetSidebarTransient,
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
  markNoticeRead,
  persistDismissedNotifications,
} from "./slices/notificationsSlice";
import type { AppDispatch, RootState } from "./index";
import {
  bootstrapPreferences,
  registerPreferenceListeners,
} from "@/lib/preferences/listeners";

export const listenerMiddleware = createListenerMiddleware();
const startAppListening = listenerMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>();

function isPresetThemeId(id: string | null | undefined): boolean {
  return Boolean(id) && PRESET_THEMES.some((theme) => theme.id === id);
}

function syncSidebarOffset(pinned: boolean, width: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(
    "--app-sidebar-offset",
    pinned ? `${width}px` : "0px",
  );
}

export function bootstrapAppState(dispatch: AppDispatch) {
  // Cached app preferences first: the auth hydrate below triggers a server
  // sync that must see any offline (pending) preference edits.
  bootstrapPreferences(dispatch);

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
    if (storedUser.id) {
      setActiveOfflineUserId(storedUser.id);
    }
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

/**
 * Explicit sign-out. useAuth().logout already awaited clearAccountLocalData()
 * (server revoke, Dexie, outbox, durable backup, spaces drafts) before
 * dispatching, so this only resets in-memory state.
 */
startAppListening({
  actionCreator: logout,
  effect: (_action, api) => {
    clearTokens();
    localStorage.removeItem(USER_STORAGE_KEY);
    api.dispatch(resetSidebarTransient());
    cancelPendingThemeSave();
    // Don't let this account's custom themes seed the next user's backend.
    const { activeThemeId } = api.getState().theme;
    api.dispatch(
      hydrateTheme({
        activeThemeId: isPresetThemeId(activeThemeId)
          ? activeThemeId
          : DEFAULT_THEME_ID,
        customThemes: [],
      }),
    );
  },
});

/**
 * Refresh token rejected: clear credentials only. The offline outbox and
 * durable backup are kept so unsynced work is pushed after re-login
 * (switchOfflineUser wipes it if a different account signs in).
 */
startAppListening({
  actionCreator: sessionExpired,
  effect: (_action, api) => {
    clearTokens();
    localStorage.removeItem(USER_STORAGE_KEY);
    api.dispatch(resetSidebarTransient());
    cancelPendingThemeSave();
  },
});

startAppListening({
  actionCreator: setSession,
  effect: (_action, api) => {
    // Persist the merged user (reducer keeps permissions / is_admin on
    // partial same-account payloads), not the raw action payload.
    const user = api.getState().auth.user;
    if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    api.dispatch(resetSidebarTransient());
    void syncThemeFromBackend(api.dispatch, api.getState);
  },
});

startAppListening({
  actionCreator: hydrateAuth,
  effect: (action, api) => {
    if (!action.payload.user || !action.payload.hasAccessToken) return;
    void syncThemeFromBackend(api.dispatch, api.getState);
  },
});

startAppListening({
  actionCreator: updatePermissions,
  effect: (_action, api) => {
    const user = api.getState().auth.user;
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
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
  effect: (action, api) => {
    const state = api.getState();
    const active = selectActiveTheme(state);
    writeActiveThemeId(state.theme.activeThemeId);
    writeCustomThemes(state.theme.customThemes);
    applyTheme(active);
    // Don't echo a backend hydrate back to PUT.
    if (action.type !== hydrateTheme.type) {
      scheduleThemeSaveToBackend(api.getState);
    }
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
  matcher: isAnyOf(dismissAllNotifications, markNoticeRead),
  effect: (_action, api) => {
    const { dismissed } = api.getState().notifications;
    const userId = api.getState().auth.user?.id;
    void persistDismissedNotifications(dismissed, userId);
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

registerPreferenceListeners(startAppListening);
