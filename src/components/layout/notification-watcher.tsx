"use client";

import { useEffect, useRef } from "react";
import { TRANSACTION_CREATED_EVENT } from "@/components/expenses/transaction-modal-provider";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { useAppDispatch } from "@/lib/store/hooks";
import {
  fetchNotifications,
  type Notice,
} from "@/lib/store/slices/notificationsSlice";

const POLL_MS = 2 * 60_000;
const SEEN_KEY = "finos:notified-ids";
const MAX_TOASTS = 2;
/** Data-change events can arrive in bursts; don't re-check more often. */
const MIN_GAP_MS = 20_000;

function readSeen(userId: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(`${SEEN_KEY}:${userId}`);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function writeSeen(userId: string, ids: Set<string>) {
  try {
    // Keep the list bounded; ids of resolved notices age out naturally.
    localStorage.setItem(
      `${SEEN_KEY}:${userId}`,
      JSON.stringify([...ids].slice(-300)),
    );
  } catch {
    /* storage unavailable: worst case a notice toasts again */
  }
}

/**
 * Keeps the bell's notifications fresh (after data changes, when the app
 * returns to the foreground, and on a slow poll) and raises a toast the
 * first time each new notification appears.
 */
export function NotificationWatcher() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { showToast } = useToast();
  const userId = user?.id;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let debounce: number | undefined;
    let lastRun = 0;

    const check = async () => {
      lastRun = Date.now();
      const result = await dispatch(fetchNotifications());
      if (cancelled || !fetchNotifications.fulfilled.match(result)) return;
      const { notices, dismissed } = result.payload;
      const open = notices.filter((notice) => !dismissed.includes(notice.id));
      const seen = readSeen(userId);
      if (!seen) {
        // First run on this device: everything is already in the bell, so
        // only remember it instead of flooding the screen with toasts.
        writeSeen(userId, new Set(open.map((notice) => notice.id)));
        return;
      }
      const fresh = open.filter((notice) => !seen.has(notice.id));
      if (!fresh.length) return;
      fresh.slice(0, MAX_TOASTS).forEach((notice: Notice) => {
        showToastRef.current({
          title: notice.title,
          description: notice.description,
          tone:
            notice.tone === "danger"
              ? "error"
              : notice.tone === "success"
                ? "success"
                : "warning",
          duration: 7000,
          action: { label: "View", href: notice.href },
        });
      });
      if (fresh.length > MAX_TOASTS) {
        showToastRef.current({
          title: `${fresh.length - MAX_TOASTS} more notification${fresh.length - MAX_TOASTS === 1 ? "" : "s"}`,
          description: "Open the bell to see them all.",
          tone: "info",
        });
      }
      for (const notice of fresh) seen.add(notice.id);
      writeSeen(userId, seen);
    };

    const schedule = () => {
      window.clearTimeout(debounce);
      const wait = Math.max(1500, lastRun + MIN_GAP_MS - Date.now());
      debounce = window.setTimeout(() => void check(), wait);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") schedule();
    };

    const first = window.setTimeout(() => void check(), 800);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, POLL_MS);
    window.addEventListener("finos:data-updated", schedule);
    window.addEventListener("finos:sync-complete", schedule);
    window.addEventListener(TRANSACTION_CREATED_EVENT, schedule);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearTimeout(debounce);
      window.clearInterval(poll);
      window.removeEventListener("finos:data-updated", schedule);
      window.removeEventListener("finos:sync-complete", schedule);
      window.removeEventListener(TRANSACTION_CREATED_EVENT, schedule);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [dispatch, userId]);

  return null;
}
