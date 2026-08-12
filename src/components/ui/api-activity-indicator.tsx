"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LoaderCircle } from "lucide-react";
import {
  getApiActivityCount,
  subscribeToApiActivity,
} from "@/lib/api/activity";

const SHOW_DELAY_MS = 180;
const MIN_VISIBLE_MS = 400;

export function ApiActivityIndicator() {
  const activeRequests = useSyncExternalStore(
    subscribeToApiActivity,
    getApiActivityCount,
    () => 0,
  );
  const [visible, setVisible] = useState(false);
  const visibleSince = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (activeRequests > 0) {
      if (!visible) {
        timer = setTimeout(() => {
          visibleSince.current = Date.now();
          setVisible(true);
        }, SHOW_DELAY_MS);
      }
    } else if (visible) {
      const elapsed = Date.now() - visibleSince.current;
      timer = setTimeout(
        () => setVisible(false),
        Math.max(0, MIN_VISIBLE_MS - elapsed),
      );
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeRequests, visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Opal is syncing data"
      className="pointer-events-none fixed inset-x-0 top-0 z-[190] flex justify-center"
    >
      <span className="api-loader-track absolute inset-x-0 top-0 h-0.5 overflow-hidden">
        <span className="api-loader-bar block h-full w-1/3 rounded-full bg-[var(--ds-focus-color)]" />
      </span>
      <span className="mt-3 flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--ds-gray-1000)_12%,transparent)] bg-[color-mix(in_srgb,var(--ds-background-elevated)_90%,transparent)] px-3 py-1.5 text-[11px] font-medium text-[var(--ds-gray-900)] shadow-[0_10px_32px_-12px_color-mix(in_srgb,var(--ds-gray-1000)_35%,transparent)] backdrop-blur-xl ds-overlay-enter">
        <LoaderCircle
          size={13}
          className="animate-spin text-[var(--ds-focus-color)]"
          aria-hidden="true"
        />
        Syncing
      </span>
    </div>
  );
}
