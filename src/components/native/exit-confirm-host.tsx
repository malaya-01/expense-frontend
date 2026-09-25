"use client";

import { useEffect, useRef } from "react";
import { showToast } from "@/lib/store/slices/uiSlice";
import { useAppDispatch } from "@/lib/store/hooks";

const EXIT_WINDOW_MS = 2000;

/**
 * Android back at a root screen: first press shows a toast,
 * second press within 2s leaves the app.
 */
export function ExitConfirmHost() {
  const dispatch = useAppDispatch();
  const armedUntil = useRef(0);

  useEffect(() => {
    const onAsk = () => {
      const now = Date.now();
      if (now < armedUntil.current) {
        armedUntil.current = 0;
        void (async () => {
          try {
            const { App } = await import("@capacitor/app");
            await App.exitApp();
          } catch {
            window.close();
          }
        })();
        return;
      }
      armedUntil.current = now + EXIT_WINDOW_MS;
      dispatch(
        showToast({
          title: "Press back again to exit",
          tone: "info",
          duration: EXIT_WINDOW_MS,
        }),
      );
    };
    window.addEventListener("finos:confirm-exit", onAsk);
    return () => window.removeEventListener("finos:confirm-exit", onAsk);
  }, [dispatch]);

  return null;
}
