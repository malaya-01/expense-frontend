"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "./index";
import { bootstrapAppState } from "./listeners";
import { registerAuthFailureHandler } from "@/lib/api/client";
import { logout } from "./slices/authSlice";
import { setAppStore } from "./store-ref";

export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
    setAppStore(storeRef.current);
  }

  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;
    bootstrapAppState(store.dispatch);
    registerAuthFailureHandler(() => {
      store.dispatch(logout());
    });
    return () => registerAuthFailureHandler(null);
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
