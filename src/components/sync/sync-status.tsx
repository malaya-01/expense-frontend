"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "@/lib/format";
import {
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Cloud,
  Wifi,
  Smartphone,
  Monitor,
} from "lucide-react";
import {
  runSync,
  subscribeSyncStatus,
  type SyncStatusSnapshot,
} from "@/lib/offline/sync-engine";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Popover } from "@/components/ui/popover";
import { getClientPlatform } from "@/lib/runtime-platform";

const EMPTY_STATUS: SyncStatusSnapshot = {
  online: true,
  syncing: false,
  pending: 0,
  failed: 0,
  conflicts: 0,
  lastSyncAt: null,
  lastError: null,
};

export function SyncStatusButton() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatusSnapshot>(EMPTY_STATUS);
  const platform = useMemo(() => getClientPlatform(), []);

  useEffect(() => {
    return subscribeSyncStatus(setStatus);
  }, []);


  const label = !status.online
    ? "Offline"
    : status.syncing
      ? "Syncing…"
      : status.conflicts > 0
        ? `${status.conflicts} conflict${status.conflicts === 1 ? "" : "s"}`
        : status.failed > 0
          ? `${status.failed} failed`
          : status.pending > 0
            ? `${status.pending} pending`
            : "Online";

  const Icon = !status.online
    ? CloudOff
    : status.conflicts > 0 || status.failed > 0
      ? AlertTriangle
      : status.syncing
        ? RefreshCw
        : status.pending > 0
          ? Cloud
          : Wifi;

  const DeviceIcon =
    platform.formFactor === "desktop" && platform.surface === "web"
      ? Monitor
      : Smartphone;

  return (
    <Popover
      align="end"
      className="w-[min(20rem,calc(100vw-1.5rem))] p-3"
      triggerLabel="Connection & sync status"
      trigger={
        <span
          className="flex h-7 items-center gap-1 rounded-[6px] px-1.5 text-[11px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]"
          title="Connection & sync status"
        >
          <Icon
            size={13}
            className={status.syncing ? "animate-spin" : undefined}
          />
          <span className="hidden sm:inline">{label}</span>
        </span>
      }
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-[var(--ds-gray-1000)]">
          Connection
        </p>
        <button
          type="button"
          disabled={!status.online || status.syncing}
          onClick={() => void runSync("manual")}
          className="rounded-[5px] px-2 py-1 text-[11px] text-[var(--ds-focus-color)] hover:bg-[var(--ds-gray-100)] disabled:opacity-50"
        >
          Sync now
        </button>
      </div>
      <ul className="space-y-1 text-[11px] text-[var(--ds-gray-800)]">
        <li className="flex items-center gap-1.5">
          <DeviceIcon size={12} className="shrink-0 text-[var(--ds-gray-700)]" />
          <span>
            Device: <strong>{platform.label}</strong>
          </span>
        </li>
        <li>
          Status: <strong>{status.online ? "Online" : "Offline"}</strong>
        </li>
        <li>Waiting to sync: {status.pending}</li>
        <li>Failed (kept locally): {status.failed}</li>
        <li>Conflicts: {status.conflicts}</li>
        <li>
          Last sync:{" "}
          {status.lastSyncAt
            ? formatDateTime(status.lastSyncAt)
            : "Never"}
        </li>
        {status.lastError ? (
          <li className="break-words text-[var(--ds-status-red)]">
            {status.lastError}
          </li>
        ) : null}
      </ul>
      <p className="mt-2 text-[10px] leading-4 text-[var(--ds-gray-700)]">
        Local data is never deleted when sync fails. Failed items retry
        automatically (free servers can take up to ~60s to wake).
      </p>

      {status.conflicts > 0 || status.failed > 0 ? (
        <Link
          href="/sync-issues"
          className="mt-3 flex items-center justify-between gap-2 rounded-[8px] bg-[color-mix(in_srgb,var(--ds-status-orange)_12%,transparent)] px-2.5 py-2 text-[12px] font-medium text-[var(--ds-gray-1000)] hover:bg-[color-mix(in_srgb,var(--ds-status-orange)_18%,transparent)]"
        >
          <span>
            {[
              status.failed > 0
                ? `${status.failed} not saved`
                : null,
              status.conflicts > 0
                ? `${status.conflicts} changed on two devices`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className="shrink-0 text-[var(--ds-focus-color)]">Review →</span>
        </Link>
      ) : null}
    </Popover>
  );
}
