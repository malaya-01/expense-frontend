"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "./index";
import { bootstrapAppState } from "./listeners";
import {
  ensureSession,
  registerAuthFailureHandler,
} from "@/lib/api/client";
import { logout } from "./slices/authSlice";
import { setAppStore } from "./store-ref";

async function markNativeAppChrome() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    document.documentElement.classList.add("native-app");
  } catch {
    /* web */
  }
}

async function registerAndroidBackHandler() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { App } = await import("@capacitor/app");
    await App.addListener("backButton", ({ canGoBack }) => {
      const path = (window.location.pathname || "/").replace(/\/$/, "") || "/";
      const atExitSurface =
        path === "/" ||
        path === "/dashboard" ||
        path === "/signin" ||
        path === "/signup" ||
        path === "/register";

      // Close open overlays first (menus / sync popover).
      window.dispatchEvent(new Event("finos:close-overlays"));

      if (atExitSurface) {
        // Ask before leaving the app (handled by ExitConfirmHost).
        window.dispatchEvent(new Event("finos:confirm-exit"));
        return;
      }
      if (canGoBack || window.history.length > 1) {
        window.history.back();
        return;
      }
      window.location.assign("/dashboard");
    });
  } catch {
    /* ignore */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
    setAppStore(storeRef.current);
  }

  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;
    let cancelled = false;

    void (async () => {
      await markNativeAppChrome();
      await registerAndroidBackHandler();
      // Restore Preferences tokens + refresh expired access via 7d refresh token.
      await ensureSession();
      if (cancelled) return;
      bootstrapAppState(store.dispatch);
    })();

    registerAuthFailureHandler(() => {
      store.dispatch(logout());
    });
    return () => {
      cancelled = true;
      registerAuthFailureHandler(null);
    };
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
