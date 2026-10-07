"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getAccessToken } from "@/lib/api/client";

const FORWARD_GUARD_KEY = "app:root-forward";
const FORWARD_GUARD_MS = 5000;

/**
 * In the Android static export, Capacitor's local server answers every
 * extension-less path (cold start on a deep link, reload, or a full page load
 * after a failed RSC fetch) with the ROOT index.html, so this page renders at
 * e.g. /spaces/view/?id=123. Return the client-side route to forward to, or
 * null when we are really at "/" (always the case on the web, where Next
 * serves the real page) or when the same target was just attempted (loop
 * guard: the target page itself is missing from the export).
 */
function takeForwardTarget(): string | null {
  if (typeof window === "undefined") return null;
  const { pathname, search, hash } = window.location;
  const path = pathname.replace(/\/+$/, "");
  if (!path || path === "/index.html") return null;
  const target = `${path}/${search}${hash}`;
  try {
    const now = Date.now();
    const raw = window.sessionStorage.getItem(FORWARD_GUARD_KEY);
    const previous = raw
      ? (JSON.parse(raw) as { target?: string; at?: number })
      : null;
    if (
      previous?.target === target &&
      typeof previous.at === "number" &&
      now - previous.at < FORWARD_GUARD_MS
    ) {
      window.sessionStorage.removeItem(FORWARD_GUARD_KEY);
      return null;
    }
    window.sessionStorage.setItem(
      FORWARD_GUARD_KEY,
      JSON.stringify({ target, at: now }),
    );
  } catch {
    // Without sessionStorage there is no loop guard; don't risk a loop.
    return null;
  }
  return target;
}

export default function HomePage() {
  const router = useRouter();
  const { ready, isAuthenticated } = useAuth();
  const forwardChecked = useRef(false);
  // While a deep-link forward is in flight, don't let the auth redirect below
  // (which re-runs when auth becomes ready) override it. If we are somehow
  // still mounted after FORWARD_GUARD_MS, fall back to the normal redirect.
  const [forwarding, setForwarding] = useState(false);

  useEffect(() => {
    if (!forwardChecked.current) {
      forwardChecked.current = true;
      const target = takeForwardTarget();
      if (target) {
        setForwarding(true);
        router.replace(target);
        return;
      }
    }
    if (forwarding) return;
    const hasSession = isAuthenticated || Boolean(getAccessToken());
    if (!ready && !hasSession) return;
    router.replace(hasSession ? "/dashboard" : "/signin");
  }, [ready, isAuthenticated, router, forwarding]);

  useEffect(() => {
    if (!forwarding) return;
    const timer = window.setTimeout(
      () => setForwarding(false),
      FORWARD_GUARD_MS,
    );
    return () => window.clearTimeout(timer);
  }, [forwarding]);

  return (
    <div className="min-h-dvh bg-transparent">
      <div className="h-0.5 w-full overflow-hidden bg-[color-mix(in_srgb,var(--ds-focus-color)_14%,transparent)]">
        <span className="api-loader-bar block h-full w-1/3 rounded-full bg-[var(--ds-focus-color)]" />
      </div>
    </div>
  );
}
