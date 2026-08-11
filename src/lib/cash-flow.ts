import { parseCalendarDate, toDateOnly } from "@/lib/format";
import type { LedgerTransaction } from "@/types";

export type CashFlowRange = "7d" | "30d" | "month" | "3m" | "6m" | "12m";
export type CashFlowGranularity = "day" | "week" | "month";
export type CashFlowSeries = "both" | "in" | "out";

export type CashFlowBucket = {
  key: string;
  label: string;
  shortLabel: string;
  start: string;
  end: string;
  inflow: number;
  outflow: number;
  net: number;
  txCount: number;
};

function iso(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function cashFlowWindow(range: CashFlowRange): {
  start: string;
  end: string;
  granularity: CashFlowGranularity;
} {
  const end = startOfDay(new Date());
  const start = startOfDay(new Date());

  if (range === "7d") start.setDate(start.getDate() - 6);
  else if (range === "30d") start.setDate(start.getDate() - 29);
  else if (range === "month") start.setDate(1);
  else if (range === "3m") start.setMonth(start.getMonth() - 2, 1);
  else if (range === "6m") start.setMonth(start.getMonth() - 5, 1);
  else start.setMonth(start.getMonth() - 11, 1);

  const granularity: CashFlowGranularity =
    range === "7d" || range === "30d" || range === "month"
      ? "day"
      : range === "3m"
        ? "week"
        : "month";

  return { start: iso(start), end: iso(end), granularity };
}

export function txBaseAmount(tx: Pick<LedgerTransaction, "amount" | "amount_base">): number {
  return Math.abs(Number(tx.amount_base ?? tx.amount) || 0);
}

/** Inflow/outflow for one transaction, optionally scoped to an account. */
export function classifyCashFlow(
  tx: LedgerTransaction,
  accountId: string,
): { inflow: number; outflow: number } | null {
  const amount = txBaseAmount(tx);
  if (!amount) return { inflow: 0, outflow: 0 };

  if (accountId === "all") {
    if (tx.type === "income") return { inflow: amount, outflow: 0 };
    if (tx.type === "expense") return { inflow: 0, outflow: amount };
    return null;
  }

  const from = tx.source_container_id === accountId;
  const to = tx.destination_container_id === accountId;
  if (!from && !to) return null;

  if (tx.type === "income" && to) return { inflow: amount, outflow: 0 };
  if (tx.type === "expense" && from) return { inflow: 0, outflow: amount };
  if (tx.type === "transfer") {
    if (from && to) return null;
    if (to) return { inflow: amount, outflow: 0 };
    if (from) return { inflow: 0, outflow: amount };
  }
  return null;
}

function bucketBounds(
  date: Date,
  granularity: CashFlowGranularity,
): { key: string; start: Date; end: Date; label: string; shortLabel: string } {
  if (granularity === "month") {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      start,
      end,
      label: start.toLocaleString("en-US", { month: "short", year: "numeric" }),
      shortLabel: start.toLocaleString("en-US", { month: "short" }),
    };
  }
  if (granularity === "week") {
    const weekday = date.getDay();
    const start = addDays(date, -((weekday + 6) % 7));
    const end = addDays(start, 6);
    return {
      key: iso(start),
      start,
      end,
      label: `${start.toLocaleString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleString("en-US", { month: "short", day: "numeric" })}`,
      shortLabel: start.toLocaleString("en-US", { month: "short", day: "numeric" }),
    };
  }
  return {
    key: iso(date),
    start: date,
    end: date,
    label: date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    shortLabel: String(date.getDate()),
  };
}

export function buildCashFlowBuckets(
  transactions: LedgerTransaction[],
  options: {
    range: CashFlowRange;
    accountId: string;
    granularity?: CashFlowGranularity;
  },
): CashFlowBucket[] {
  const window = cashFlowWindow(options.range);
  const granularity = options.granularity ?? window.granularity;
  const start = parseCalendarDate(window.start);
  const end = parseCalendarDate(window.end);
  const map = new Map<string, CashFlowBucket>();

  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const bounds = bucketBounds(cursor, granularity);
    if (bounds.end < start || bounds.start > end) continue;
    if (map.has(bounds.key)) continue;
    const clippedStart = bounds.start < start ? start : bounds.start;
    const clippedEnd = bounds.end > end ? end : bounds.end;
    map.set(bounds.key, {
      key: bounds.key,
      label: bounds.label,
      shortLabel: bounds.shortLabel,
      start: iso(clippedStart),
      end: iso(clippedEnd),
      inflow: 0,
      outflow: 0,
      net: 0,
      txCount: 0,
    });
  }

  for (const tx of transactions) {
    const date = toDateOnly(tx.date);
    if (!date || date < window.start || date > window.end) continue;
    const flow = classifyCashFlow(tx, options.accountId);
    if (!flow) continue;
    const bounds = bucketBounds(parseCalendarDate(date), granularity);
    const bucket = map.get(bounds.key);
    if (!bucket) continue;
    bucket.inflow += flow.inflow;
    bucket.outflow += flow.outflow;
    bucket.txCount += 1;
    bucket.net = bucket.inflow - bucket.outflow;
  }

  return [...map.values()];
}

export function filterCashFlowTransactions(
  transactions: LedgerTransaction[],
  options: {
    accountId: string;
    start: string;
    end: string;
    series: CashFlowSeries;
  },
): LedgerTransaction[] {
  return transactions
    .filter((tx) => {
      const date = toDateOnly(tx.date);
      if (!date || date < options.start || date > options.end) return false;
      const flow = classifyCashFlow(tx, options.accountId);
      if (!flow) return false;
      if (options.series === "in") return flow.inflow > 0;
      if (options.series === "out") return flow.outflow > 0;
      return true;
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
