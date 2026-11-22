"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import {
  dismissMiragePrompt,
  downloadMirageModel,
  miragePromptState,
} from "@/lib/receipts/mirage-device";

/**
 * After an app update, ask once to keep the receipt reader on the phone.
 * Later scans use that model and do not wait on the vision API.
 */
export function MirageDownloadPrompt() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    void miragePromptState().then((state) => {
      if (cancelled) return;
      if (state === "offer") setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!open) return null;

  const downloading = progress != null;

  return (
    <div className="fixed inset-x-3 z-40 bottom-[calc(96px+env(safe-area-inset-bottom))] md:bottom-6 md:left-auto md:right-6 md:max-w-sm">
      <div className="rounded-[16px] border border-[color:color-mix(in_srgb,var(--ds-gray-1000)_12%,transparent)] bg-[var(--ds-background-elevated)] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
        <p className="text-[14px] font-semibold text-[var(--ds-gray-1000)]">
          Faster receipt scans on this phone
        </p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--ds-gray-700)]">
          Download the receipt reader once (about 22 MB). It stays on this
          phone, so a scan does not wait on the server.
        </p>
        {downloading ? (
          <p className="mt-3 text-[12px] text-[var(--ds-gray-700)]">
            Downloading… {progress > 0 ? `${progress}%` : ""}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 text-[12px] text-[var(--ds-status-red)]">{error}</p>
        ) : null}
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            loading={downloading}
            onClick={() => {
              setError("");
              setProgress(0);
              void downloadMirageModel((loaded, total) => {
                setProgress(total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0);
              })
                .then(() => setOpen(false))
                .catch((err: Error) => {
                  setProgress(null);
                  setError(err?.message || "Download failed. Try again.");
                });
            }}
          >
            Download
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={downloading}
            onClick={() => {
              dismissMiragePrompt();
              setOpen(false);
            }}
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
