"use client";

import { getRecordSyncState, type SyncUiState } from "@/lib/offline/repository";
import { cn } from "@/lib/cn";

const LABELS: Record<SyncUiState, string> = {
  synced: "Synced",
  pending: "Pending sync",
  offline: "Offline",
  failed: "Sync failed",
};

export function SyncBadge({
  row,
  className,
}: {
  row?: { _pending?: boolean; _sync_failed?: boolean } | null;
  className?: string;
}) {
  const state = getRecordSyncState(row);
  if (state === "synced") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        state === "offline" &&
          "bg-[color-mix(in_srgb,var(--ds-gray-700)_18%,transparent)] text-[var(--ds-gray-800)]",
        state === "pending" &&
          "bg-[color-mix(in_srgb,var(--ds-focus-color)_16%,transparent)] text-[var(--ds-focus-color)]",
        state === "failed" &&
          "bg-[color-mix(in_srgb,var(--ds-status-red)_16%,transparent)] text-[var(--ds-status-red)]",
        className,
      )}
      title={LABELS[state]}
    >
      {state === "pending" ? "Pending" : state === "failed" ? "Failed" : "Offline"}
    </span>
  );
}
