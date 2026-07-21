"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { listBudgets } from "@/lib/api/budgets";
import { listGoals } from "@/lib/api/goals";
import { listRecurringSchedules } from "@/lib/api/recurring";

type Notice = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "warning" | "danger" | "success";
  icon: typeof Bell;
};

const DISMISSED_KEY = "finos:dismissed-notifications";

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

export function NotificationCenter() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const load = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const [budgets, goals, schedules] = await Promise.all([
        listBudgets().catch(() => []),
        listGoals().catch(() => []),
        listRecurringSchedules().catch(() => []),
      ]);
      const next: Notice[] = [];
      for (const budget of budgets) {
        if (budget.status === "over") {
          next.push({
            id: `budget-over-${budget.id}`,
            title: `${budget.name} is over budget`,
            description: `Spending reached ${budget.percent.toFixed(0)}% of the planned amount.`,
            href: "/budgets",
            tone: "danger",
            icon: CircleAlert,
          });
        } else if (budget.status === "warning") {
          next.push({
            id: `budget-warning-${budget.id}`,
            title: `${budget.name} is near its limit`,
            description: `${budget.percent.toFixed(0)}% used — review spending before the period ends.`,
            href: "/budgets",
            tone: "warning",
            icon: Flag,
          });
        }
      }
      for (const goal of goals) {
        if (goal.status === "behind" || goal.status === "at_risk") {
          next.push({
            id: `goal-risk-${goal.id}`,
            title: `${goal.name} needs attention`,
            description: `Progress is ${goal.percent.toFixed(0)}%. Review the forecast and contribution plan.`,
            href: "/goals",
            tone: "warning",
            icon: Target,
          });
        } else if (goal.status === "achieved") {
          next.push({
            id: `goal-achieved-${goal.id}`,
            title: `${goal.name} achieved`,
            description: "Your target has been reached.",
            href: "/goals",
            tone: "success",
            icon: Target,
          });
        }
      }
      const today = new Date();
      const todayKey = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");
      for (const schedule of schedules) {
        if (schedule.last_error) {
          next.push({
            id: `recurring-failed-${schedule.id}-${schedule.updated_at}`,
            title: `${schedule.name} was paused`,
            description: schedule.last_error,
            href: "/recurring",
            tone: "danger",
            icon: CircleAlert,
          });
        } else if (
          schedule.status === "active" &&
          schedule.execution_mode === "review" &&
          schedule.next_execution <= todayKey
        ) {
          next.push({
            id: `recurring-due-${schedule.id}-${schedule.next_execution}`,
            title: `${schedule.name} is ready to post`,
            description:
              "Review and post this scheduled transaction from Recurring.",
            href: "/recurring",
            tone: "warning",
            icon: Flag,
          });
        }
      }
      setNotices(next);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 800);
    return () => window.clearTimeout(timer);
    // Load once after the shell settles; no polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(
    () => notices.filter((notice) => !dismissed.includes(notice.id)),
    [notices, dismissed],
  );

  function dismissAll() {
    const ids = [...new Set([...dismissed, ...notices.map((item) => item.id)])];
    setDismissed(ids);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  }

  return (
    <Popover
      className="w-[360px] p-0"
      onOpenChange={(open) => {
        if (open && !loaded) void load();
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
            onClick={() => void load()}
            disabled={loading}
            className="flex size-8 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] disabled:opacity-50 ds-focus"
            aria-label="Refresh notifications"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {visible.length ? (
            <button
              type="button"
              onClick={dismissAll}
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
          visible.map((notice) => (
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
                <notice.icon size={17} />
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
          ))
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
          <Button variant="ghost" size="sm" className="w-full" onClick={dismissAll}>
            Mark all as read
          </Button>
        </div>
      ) : null}
    </Popover>
  );
}
