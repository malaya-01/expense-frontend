"use client";

import { useEffect, useState } from "react";
import { CloudOff, ShieldCheck, Wifi } from "lucide-react";
import { bindSpaceOutboxFlush, flushSpaceOutbox } from "@/lib/spaces/offline-outbox";

export function AppStatusBar() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    bindSpaceOutboxFlush();
    const goOnline = () => {
      setOnline(true);
      void flushSpaceOutbox().then((r) =>
        setPending((p) => Math.max(0, p - r.synced)),
      );
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <footer className="hidden h-7 shrink-0 items-center justify-between border-t border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] px-4 text-[10px] text-[var(--ds-gray-700)] md:flex">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          {online ? <Wifi size={11} /> : <CloudOff size={11} />}
          {online ? "Connected" : "Offline"}
          {pending > 0 ? ` · ${pending} queued` : null}
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={11} />
          Credentials encrypted
        </span>
      </div>
      <span>FinOS 0.1.0</span>
    </footer>
  );
}
