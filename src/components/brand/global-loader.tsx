"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ScanLine, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { APP_NAME } from "@/lib/brand";

/** Receipt scan shown as a small floating card; the app stays usable. */
export type ReceiptScanState = {
  /** Object URL of the picked image (shown as a thumbnail). */
  previewUrl?: string;
  /** 0–1 while the image is uploading; null once the server is reading it. */
  uploadProgress?: number | null;
  onCancel?: () => void;
};

type GlobalLoaderContextValue = {
  show: (label: string | null) => void;
  /** Start/update (object) or hide (null) the receipt scan card. */
  showScan: (state: ReceiptScanState | null) => void;
};

const GlobalLoaderContext = createContext<GlobalLoaderContextValue | null>(
  null,
);

function isReceiptLabel(label: string): boolean {
  const text = label.toLowerCase();
  return (
    text.includes("receipt") ||
    text.includes("groq") ||
    text.includes("gemini") ||
    text.includes("image") ||
    text.includes("preparing")
  );
}

function publicLabel(label: string): string {
  if (label.toLowerCase().includes("sign")) return "Signing in";
  return label;
}

export function GlobalLoaderProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  const [scan, setScan] = useState<ReceiptScanState | null>(null);
  const show = useCallback((next: string | null) => {
    // Receipt reading never takes over the whole screen.
    if (next && isReceiptLabel(next)) {
      setScan((prev) => prev || {});
      return;
    }
    if (next === null) setScan(null);
    setLabel(next ? publicLabel(next) : null);
  }, []);
  const showScan = useCallback((next: ReceiptScanState | null) => {
    setScan((prev) => (next ? { ...(prev || {}), ...next } : null));
  }, []);
  const value = useMemo(() => ({ show, showScan }), [show, showScan]);

  return (
    <GlobalLoaderContext.Provider value={value}>
      {children}
      <GlobalLoaderOverlay label={label} />
      <ReceiptScanCard scan={scan} />
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

function scanStage(
  uploadProgress: number | null | undefined,
  seconds: number,
): string {
  if (typeof uploadProgress === "number" && uploadProgress < 1) {
    return `Uploading ${Math.round(uploadProgress * 100)}%`;
  }
  if (seconds < 12) return "Reading amount, date and merchant";
  if (seconds < 25) return "Double-checking totals";
  return "Still working — busy receipts take longer";
}

function ReceiptScanCard({ scan }: { scan: ReceiptScanState | null }) {
  const active = Boolean(scan);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    setStartedAt(start);
    setNow(start);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  if (!scan || typeof document === "undefined") return null;
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const uploading =
    typeof scan.uploadProgress === "number" && scan.uploadProgress < 1;
  const stage = scanStage(scan.uploadProgress, seconds);

  return createPortal(
    <div
      className="receipt-scan-card fixed inset-x-3 bottom-[calc(136px+env(safe-area-inset-bottom))] z-[300] mx-auto max-w-[420px] md:inset-x-auto md:bottom-6 md:right-6 md:w-[380px]"
      role="status"
      aria-live="polite"
      aria-busy
    >
      <div className="flex items-center gap-3 p-3">
        <div className="receipt-scan-thumb relative size-12 shrink-0 overflow-hidden rounded-[10px] bg-[color-mix(in_srgb,var(--ds-focus-color)_14%,transparent)]">
          {scan.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={scan.previewUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-[var(--ds-focus-color)]">
              <ScanLine size={20} strokeWidth={1.8} />
            </span>
          )}
          <span className="receipt-scan-beam" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[var(--ds-gray-1000)]">
            Reading receipt
            <span className="ml-1.5 text-[12px] font-normal tabular-nums text-[var(--ds-gray-700)]">
              {seconds}s
            </span>
          </p>
          <p className="truncate text-[12px] text-[var(--ds-gray-700)]">
            {stage}
          </p>
          <span className="api-loader-track mt-2 block h-1 overflow-hidden rounded-full">
            {uploading ? (
              <span
                className="block h-full rounded-full bg-[var(--ds-focus-color)] transition-[width] duration-200"
                style={{ width: `${Math.round((scan.uploadProgress || 0) * 100)}%` }}
              />
            ) : (
              <span className="api-loader-bar block h-full w-1/3 rounded-full bg-[var(--ds-focus-color)]" />
            )}
          </span>
        </div>
        {scan.onCancel ? (
          <button
            type="button"
            onClick={scan.onCancel}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--ds-gray-900)] transition-colors hover:bg-[var(--ds-gray-100)] ds-focus"
            aria-label="Cancel receipt scan"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
