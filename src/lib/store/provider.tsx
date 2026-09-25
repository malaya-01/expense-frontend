"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "./index";
import { bootstrapAppState } from "./listeners";
import {
  ensureNativeApiBase,
  ensureSession,
  registerAuthFailureHandler,
} from "@/lib/api/client";
import { logout } from "./slices/authSlice";
import { setAppStore } from "./store-ref";
import { closeTopOverlay } from "@/lib/native/overlay-back";
import {
  hasInAppHistory,
  installHistoryDepthTracker,
  isDashboardAnchor,
} from "@/lib/native/back-history";

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
    installHistoryDepthTracker();
    const { App } = await import("@capacitor/app");
    await App.addListener("backButton", ({ canGoBack }) => {
      if (closeTopOverlay()) return;

      window.dispatchEvent(new Event("finos:close-overlays"));

      if (canGoBack || hasInAppHistory()) {
        window.history.back();
        return;
      }

      if (!isDashboardAnchor()) {
        window.location.replace("/dashboard");
        return;
      }

      window.dispatchEvent(new Event("finos:confirm-exit"));
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
    // After hydration only — reading localStorage during render mismatches SSR.
    bootstrapAppState(store.dispatch);

    void (async () => {
      await markNativeAppChrome();
      ensureNativeApiBase();
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
