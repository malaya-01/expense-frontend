"use client";

import { useEffect, useState } from "react";
import {
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Cloud,
  Wifi,
} from "lucide-react";
import {
  bootstrapOfflineSync,
  runSync,
  subscribeSyncStatus,
  type SyncStatusSnapshot,
} from "@/lib/offline/sync-engine";
import {
  listConflicts,
  resolveKeepLocal,
  resolveKeepRemote,
} from "@/lib/offline/conflicts";
import type { ConflictItem } from "@/lib/offline/db";
import { useAuth } from "@/lib/auth-context";

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
  const [open, setOpen] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);

  useEffect(() => {
    void bootstrapOfflineSync(user?.id);
    return subscribeSyncStatus(setStatus);
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    void listConflicts().then(setConflicts);
  }, [open, status.conflicts]);

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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 items-center gap-1 rounded-[6px] px-1.5 text-[11px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
        title="Connection & sync status"
        aria-label="Connection & sync status"
      >
        <Icon
          size={13}
          className={status.syncing ? "animate-spin" : undefined}
        />
        <span className="hidden sm:inline">{label}</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-8 z-[80] w-[min(20rem,calc(100vw-1rem))] rounded-[8px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] p-3 shadow-lg">
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
            <li>
              Status:{" "}
              <strong>{status.online ? "Online" : "Offline"}</strong>
            </li>
            <li>Waiting to sync: {status.pending}</li>
            <li>Failed (kept locally): {status.failed}</li>
            <li>Conflicts: {status.conflicts}</li>
            <li>
              Last sync:{" "}
              {status.lastSyncAt
                ? new Date(status.lastSyncAt).toLocaleString()
                : "Never"}
            </li>
            {status.lastError ? (
              <li className="text-[var(--ds-status-red)]">{status.lastError}</li>
            ) : null}
          </ul>
          <p className="mt-2 text-[10px] text-[var(--ds-gray-700)]">
            Local data is never deleted when sync fails. Failed items retry
            automatically (free servers can take up to ~60s to wake).
          </p>

          {conflicts.length > 0 ? (
            <div className="mt-3 space-y-2 border-t border-[var(--ds-gray-200)] pt-2">
              <p className="text-[11px] font-medium text-[var(--ds-gray-1000)]">
                Resolve conflicts
              </p>
              {conflicts.map((c) => (
                <div
                  key={c.id}
                  className="rounded-[6px] bg-[var(--ds-gray-100)] p-2"
                >
                  <p className="text-[11px] text-[var(--ds-gray-900)]">
                    {c.entity_type} · {c.entity_id.slice(0, 8)}…
                  </p>
                  <div className="mt-1.5 flex gap-1">
                    <button
                      type="button"
                      className="rounded-[5px] bg-[var(--ds-background-100)] px-2 py-1 text-[10px]"
                      onClick={async () => {
                        if (c.id == null) return;
                        await resolveKeepLocal(c.id);
                        setConflicts(await listConflicts());
                        void runSync("conflict-local");
                      }}
                    >
                      Keep local
                    </button>
                    <button
                      type="button"
                      className="rounded-[5px] bg-[var(--ds-background-100)] px-2 py-1 text-[10px]"
                      onClick={async () => {
                        if (c.id == null) return;
                        await resolveKeepRemote(c.id);
                        setConflicts(await listConflicts());
                      }}
                    >
                      Keep remote
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
