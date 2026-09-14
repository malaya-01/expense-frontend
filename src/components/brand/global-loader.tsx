"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { BrandLogo } from "@/components/brand/brand-logo";
import { APP_NAME } from "@/lib/brand";

type GlobalLoaderContextValue = {
  show: (label: string | null) => void;
};

const GlobalLoaderContext = createContext<GlobalLoaderContextValue | null>(
  null,
);

function publicLabel(label: string): string {
  const text = label.toLowerCase();
  if (
    text.includes("receipt") ||
    text.includes("groq") ||
    text.includes("gemini") ||
    text.includes("image") ||
    text.includes("preparing")
  ) {
    return "Reading receipt";
  }
  if (text.includes("sign")) return "Signing in";
  return label;
}

export function GlobalLoaderProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  const show = useCallback((next: string | null) => {
    setLabel(next ? publicLabel(next) : null);
  }, []);
  const value = useMemo(() => ({ show }), [show]);

  return (
    <GlobalLoaderContext.Provider value={value}>
      {children}
      <GlobalLoaderOverlay label={label} />
    </GlobalLoaderContext.Provider>
  );
}

export function useGlobalLoader() {
  const context = useContext(GlobalLoaderContext);
  if (!context) {
    throw new Error("useGlobalLoader must be used inside GlobalLoaderProvider");
  }
  return context;
}

function GlobalLoaderOverlay({ label }: { label: string | null }) {
  if (!label || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-nested-overlay
      className="opal-page-loader"
      role="status"
      aria-live="polite"
      aria-busy
      aria-label={label}
    >
      <span className="opal-page-loader-edge" aria-hidden>
        <span className="api-loader-bar block h-full w-1/3 rounded-full bg-[var(--ds-focus-color)]" />
      </span>
      <div className="relative flex flex-col items-center">
        <span className="opal-page-loader-halo" aria-hidden />
        <BrandLogo size={72} plated />
        <p className="mt-5 text-[15px] font-semibold tracking-[-0.2px] text-[var(--ds-gray-1000)]">
          {APP_NAME}
        </p>
        <p className="mt-1 text-[13px] text-[var(--ds-gray-700)]">{label}</p>
        <span className="api-loader-track mt-5 h-0.5 w-32 overflow-hidden rounded-full">
          <span className="api-loader-bar block h-full w-1/3 rounded-full bg-[var(--ds-focus-color)]" />
        </span>
      </div>
    </div>,
    document.body,
  );
}
