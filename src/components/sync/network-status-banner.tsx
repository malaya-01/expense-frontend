"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import {
  bootstrapOfflineSync,
  runSync,
  subscribeSyncStatus,
  type SyncStatusSnapshot,
} from "@/lib/offline/sync-engine";
import { cn } from "@/lib/cn";
import { getApiBaseUrl, isLocalhostApiUrl } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

const EMPTY: SyncStatusSnapshot = {
  online: true,
  syncing: false,
  pending: 0,
  failed: 0,
  conflicts: 0,
  lastSyncAt: null,
  lastError: null,
};

/**
 * Global connection strip — visible on web and Capacitor mobile.
 */
export function NetworkStatusBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatusSnapshot>(EMPTY);
  const [badApi, setBadApi] = useState(false);

  useEffect(() => {
    void bootstrapOfflineSync(user?.id);
    setBadApi(isLocalhostApiUrl(getApiBaseUrl()));
    return subscribeSyncStatus(setStatus);
  }, [user?.id]);

  const show =
    badApi ||
    !status.online ||
    status.syncing ||
    status.pending > 0 ||
    status.failed > 0 ||
    Boolean(status.lastError);

  if (!show) return null;

  const tone = badApi
    ? "warn"
    : !status.online
      ? "offline"
      : status.failed > 0 || status.lastError
        ? "warn"
        : status.syncing
          ? "sync"
          : "pending";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b px-3 py-1.5 text-[11px]",
        tone === "offline" &&
          "border-[color-mix(in_srgb,var(--ds-gray-700)_25%,transparent)] bg-[color-mix(in_srgb,var(--ds-gray-700)_12%,transparent)] text-[var(--ds-gray-900)]",
        tone === "warn" &&
          "border-[color-mix(in_srgb,var(--ds-status-orange)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-status-orange)_12%,transparent)] text-[var(--ds-gray-1000)]",
        tone === "sync" &&
          "border-[color-mix(in_srgb,var(--ds-focus-color)_25%,transparent)] bg-[color-mix(in_srgb,var(--ds-focus-color)_10%,transparent)] text-[var(--ds-gray-1000)]",
        tone === "pending" &&
          "border-[color-mix(in_srgb,var(--ds-focus-color)_20%,transparent)] bg-[color-mix(in_srgb,var(--ds-focus-color)_8%,transparent)] text-[var(--ds-gray-900)]",
      )}
      role="status"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {!status.online ? (
          <CloudOff size={12} className="shrink-0" />
        ) : status.syncing ? (
          <RefreshCw size={12} className="shrink-0 animate-spin" />
        ) : (
          <Wifi size={12} className="shrink-0" />
        )}
        <span className="truncate">
          {badApi
            ? `API is set to ${getApiBaseUrl()} — the phone cannot reach localhost. Open Settings → Offline & Sync → Use Render production.`
            : !status.online
              ? "You’re offline — changes are saved on this device and will sync when you’re back online."
              : status.syncing
                ? "Syncing with server… (free hosts can take up to a minute to wake)"
                : status.failed > 0
                  ? `${status.failed} change${status.failed === 1 ? "" : "s"} failed to sync — kept locally. ${status.lastError || "Tap Sync now or fix API URL in Settings."}`
                  : status.pending > 0
                    ? `${status.pending} local change${status.pending === 1 ? "" : "s"} waiting to sync.`
                    : status.lastError || "Connected"}
        </span>
      </div>
      {status.online && (status.pending > 0 || status.failed > 0) && !badApi ? (
        <button
          type="button"
          disabled={status.syncing}
          onClick={() => void runSync("manual")}
          className="shrink-0 rounded-[4px] px-2 py-0.5 font-medium text-[var(--ds-focus-color)] hover:underline disabled:opacity-50"
        >
          Sync now
        </button>
      ) : null}
    </div>
  );
}
