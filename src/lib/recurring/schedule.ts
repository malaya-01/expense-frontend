import { todayISO } from "@/lib/format";
import type { RecurringSchedule } from "@/types";

/**
 * Next run date — mirrors the backend RecurringService.nextDate: month-based
 * frequencies stay anchored to the start date's day and clamp to month end.
 */
export function nextRecurringDate(
  value: string,
  frequency: RecurringSchedule["frequency"],
  anchor: string,
): string {
  const [y, m, d] = value.split("-").map(Number);
  const anchorDay = Number(String(anchor).slice(8, 10)) || d;
  const addMonths = (n: number) => {
    const lastDay = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m - 1 + n, Math.min(anchorDay, lastDay)));
  };
  let date: Date;
  if (frequency === "daily") date = new Date(Date.UTC(y, m - 1, d + 1));
  else if (frequency === "weekly") date = new Date(Date.UTC(y, m - 1, d + 7));
  else if (frequency === "biweekly") date = new Date(Date.UTC(y, m - 1, d + 14));
  else if (frequency === "monthly") date = addMonths(1);
  else if (frequency === "quarterly") date = addMonths(3);
  else if (frequency === "semiannual") date = addMonths(6);
  else date = addMonths(12);
  return date.toISOString().slice(0, 10);
}

export type RecurringDueInfo = {
  /** Runs dated today or earlier that have not been posted yet. */
  dueCount: number;
  /** Runs dated before today ("Skip missed" drops these). */
  missedCount: number;
  /** First run on or after today — where "Skip missed" jumps to. */
  skipTo: string;
};

/** How far behind an active schedule is, as of today (local calendar). */
export function recurringDueInfo(
  schedule: RecurringSchedule,
  today = todayISO(),
): RecurringDueInfo {
  let next = schedule.next_execution;
  let dueCount = 0;
  let missedCount = 0;
  let skipTo = "";
  if (schedule.status !== "active") {
    return { dueCount: 0, missedCount: 0, skipTo: next };
  }
  while (next && next <= today && dueCount < 1000) {
    if (schedule.end_date && next > schedule.end_date) break;
    if (next < today) missedCount += 1;
    else if (!skipTo) skipTo = next;
    dueCount += 1;
    next = nextRecurringDate(next, schedule.frequency, schedule.start_date);
  }
  return { dueCount, missedCount, skipTo: skipTo || next };
}
