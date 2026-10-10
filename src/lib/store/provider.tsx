"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "./index";
import { bootstrapAppState } from "./listeners";
import {
  ensureNativeApiBase,
  ensureSession,
  getAccessToken,
  registerAuthFailureHandler,
  registerRouteReplacer,
  touchSession,
} from "@/lib/api/client";
import { sessionExpired } from "./slices/authSlice";
import { setAppStore } from "./store-ref";
import { closeTopOverlay } from "@/lib/native/overlay-back";
import {
  backFallbackPath,
  hasInAppHistory,
  installHistoryDepthTracker,
  isAuthEntry,
  isExitAnchor,
  resetHistoryDepth,
} from "@/lib/native/back-history";
import { initLiveUpdates } from "@/lib/native/live-update";
import { installKeyboardWatcher } from "@/lib/native/keyboard-state";

/**
 * Client-side navigation for the native back handler. On Android a full page
 * load to any path serves the root index.html (which redirects), so prefer
 * the Next router and only fall back to location.replace.
 */
let replaceRoute: ((href: string) => void) | null = null;

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

      // A web login revokes this phone, but the WebView still has every
      // screen from before that. history.back() reopens those screens, the
      // app shell sends the user to sign-in, and the next Back does it again.
      if (!getAccessToken()) {
        resetHistoryDepth();
        if (isAuthEntry()) {
          window.dispatchEvent(new Event("finos:confirm-exit"));
          return;
        }
        if (replaceRoute) replaceRoute("/signin");
        else window.location.replace("/signin");
        return;
      }

      touchSession();

      if (canGoBack || hasInAppHistory()) {
        window.history.back();
        return;
      }

      if (!isExitAnchor()) {
        const target = backFallbackPath(Boolean(getAccessToken()));
        if (replaceRoute) replaceRoute(target);
        else window.location.replace(target);
        return;
      }

      window.dispatchEvent(new Event("finos:confirm-exit"));
    });
  } catch {
    /* ignore */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
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
    // Independent of session restore so a slow login can't trigger rollback.
    void initLiveUpdates();
    installKeyboardWatcher();

    void (async () => {
      await markNativeAppChrome();
      ensureNativeApiBase();
      await registerAndroidBackHandler();
      // Restore Preferences tokens + refresh expired access via 7d refresh token.
      await ensureSession();
      if (cancelled) return;
      touchSession();
      bootstrapAppState(store.dispatch);
    })();

    // Refresh rejected: drop credentials only — keep the offline outbox.
    registerAuthFailureHandler(() => {
      store.dispatch(sessionExpired());
    });
    return () => {
      cancelled = true;
      registerAuthFailureHandler(null);
    };
  }, []);

  useEffect(() => {
    const replace = (href: string) => {
      resetHistoryDepth();
      router.replace(href);
    };
    replaceRoute = replace;
    registerRouteReplacer(replace);
    const onVisible = () => {
      if (document.visibilityState === "visible") touchSession();
    };
    document.addEventListener("visibilitychange", onVisible);
    let nativeListener: { remove: () => Promise<void> } | null = null;
    let dropped = false;
    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform() || dropped) return;
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) touchSession();
        });
        if (dropped) {
          void handle.remove();
          return;
        }
        nativeListener = handle;
      } catch {
        /* web */
      }
    })();
    return () => {
      dropped = true;
      replaceRoute = null;
      registerRouteReplacer(null);
      document.removeEventListener("visibilitychange", onVisible);
      void nativeListener?.remove();
    };
  }, [router]);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
