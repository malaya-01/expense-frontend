"use client";

import { useEffect, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";
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
 * Shows only actionable connection problems.
 * Routine syncing / pending counts live in the header SyncStatusButton.
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
    status.failed > 0 ||
    (Boolean(status.lastError) && !status.syncing);

  if (!show) return null;

  const tone = badApi || status.failed > 0 || status.lastError ? "warn" : "offline";

  return (
    <div
      className={cn(
        "mb-3 flex items-center justify-between gap-2 rounded-[8px] border px-3 py-1.5 text-[11px]",
        tone === "offline" &&
          "border-[color-mix(in_srgb,var(--ds-gray-700)_25%,transparent)] bg-[color-mix(in_srgb,var(--ds-gray-700)_12%,transparent)] text-[var(--ds-gray-900)]",
        tone === "warn" &&
          "border-[color-mix(in_srgb,var(--ds-status-orange)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-status-orange)_12%,transparent)] text-[var(--ds-gray-1000)]",
      )}
      role="status"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {!status.online ? (
          <CloudOff size={12} className="shrink-0" />
        ) : (
          <Wifi size={12} className="shrink-0" />
        )}
        <span className="truncate">
          {badApi
            ? `API is set to ${getApiBaseUrl()} — the phone cannot reach localhost. Open Settings → Offline & Sync → Use Render production.`
            : !status.online
              ? "You’re offline — changes are saved on this device and will sync when you’re back online."
              : status.failed > 0
                ? `${status.failed} change${status.failed === 1 ? "" : "s"} failed to sync — kept locally. ${status.lastError || "Tap Sync in the header or fix API URL in Settings."}`
                : status.lastError || "Connection issue — check Sync in the header."}
        </span>
      </div>
      {status.online && status.failed > 0 && !badApi ? (
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
