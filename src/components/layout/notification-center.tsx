"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CircleAlert,
  Flag,
  RefreshCw,
  Target,
} from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  dismissAllNotifications,
  fetchNotifications,
  selectVisibleNotifications,
  type Notice,
} from "@/lib/store/slices/notificationsSlice";

function iconFor(notice: Notice) {
  if (notice.kind === "goal") return Target;
  if (notice.tone === "danger") return CircleAlert;
  return Flag;
}

export function NotificationCenter() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state) => state.notifications.loading);
  const loaded = useAppSelector((state) => state.notifications.loaded);
  const visible = useAppSelector(selectVisibleNotifications);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void dispatch(fetchNotifications());
    }, 800);
    return () => window.clearTimeout(timer);
  }, [dispatch]);

  return (
    <Popover
      className="w-[360px] p-0"
      onOpenChange={(open) => {
        if (open && !loaded) void dispatch(fetchNotifications());
      }}
      trigger={
        <span className="relative flex size-9 items-center justify-center rounded-[9px] text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)]">
          <Bell size={16} />
          {visible.length ? (
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[var(--ds-status-red)] ring-2 ring-[var(--ds-background-elevated)]" />
          ) : null}
          <span className="sr-only">
            Notifications{visible.length ? `, ${visible.length} unread` : ""}
          </span>
        </span>
      }
    >
      <div className="flex items-center justify-between border-b border-[var(--ds-gray-200)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Notifications</p>
          <p className="mt-0.5 text-[10px] text-[var(--ds-gray-700)]">
            Actionable signals from your financial twin
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => void dispatch(fetchNotifications())}
            disabled={loading}
            className="flex size-8 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] disabled:opacity-50 ds-focus"
            aria-label="Refresh notifications"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {visible.length ? (
            <button
              type="button"
              onClick={() => dispatch(dismissAllNotifications())}
              className="flex size-8 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] ds-focus"
              aria-label="Dismiss all notifications"
            >
              <CheckCheck size={15} />
            </button>
          ) : null}
        </div>
      </div>
      <div className="max-h-[360px] overflow-y-auto p-2">
        {loading && !loaded ? (
          <div className="px-4 py-10 text-center text-xs text-[var(--ds-gray-700)]">
            Checking your financial signals…
          </div>
        ) : visible.length ? (
          visible.map((notice) => {
            const Icon = iconFor(notice);
            return (
              <button
                key={notice.id}
                type="button"
                onClick={() => router.push(notice.href)}
                className="flex w-full items-start gap-3 rounded-[10px] px-3 py-3 text-left hover:bg-[var(--ds-background-100)] ds-focus"
              >
                <span
                  className={
                    notice.tone === "danger"
                      ? "text-[var(--ds-status-red)]"
                      : notice.tone === "success"
                        ? "text-[var(--ds-status-green)]"
                        : "text-[var(--ds-status-orange)]"
                  }
                >
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium">
                    {notice.title}
                  </span>
                  <span className="mt-1 block text-[11px] leading-4 text-[var(--ds-gray-700)]">
                    {notice.description}
                  </span>
                </span>
              </button>
            );
          })
        ) : (
          <div className="px-5 py-10 text-center">
            <CheckCheck
              size={24}
              className="mx-auto text-[var(--ds-status-green)]"
            />
            <p className="mt-3 text-sm font-medium">You’re all caught up</p>
            <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
              New budget and goal signals will appear here.
            </p>
          </div>
        )}
      </div>
      {visible.length ? (
        <div className="border-t border-[var(--ds-gray-200)] p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => dispatch(dismissAllNotifications())}
          >
            Mark all as read
          </Button>
        </div>
      ) : null}
    </Popover>
  );
}
