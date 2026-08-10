"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Listens for Android back-at-root → shows "exit app?" confirmation.
 */
export function ExitConfirmHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onAsk = () => {
      setOpen((current) => {
        // Second back while dialog is open cancels exit.
        if (current) return false;
        return true;
      });
    };
    window.addEventListener("finos:confirm-exit", onAsk);
    return () => window.removeEventListener("finos:confirm-exit", onAsk);
  }, []);

  return (
    <ConfirmDialog
      open={open}
      title="Exit FinOS?"
      description="Are you sure you want to close the app?"
      confirmLabel="Exit"
      destructive
      onClose={() => setOpen(false)}
      onConfirm={async () => {
        setOpen(false);
        try {
          const { App } = await import("@capacitor/app");
          await App.exitApp();
        } catch {
          window.close();
        }
      }}
    />
  );
}
