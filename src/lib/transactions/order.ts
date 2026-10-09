import { timeFromPaidAt } from "@/lib/receipts/defaults-from-parse";

type Dated = {
  date: string;
  paid_at?: string | null;
  created_at?: string | null;
};

/** HH:mm the transaction happened; falls back to when it was recorded. */
function timeOfDay(tx: Dated): string {
  return timeFromPaidAt(tx.paid_at) || timeFromPaidAt(tx.created_at) || "";
}

/**
 * Chronological order by transaction date, then time of day (paid_at), then
 * creation time. Negate (or swap the arguments) for newest-first.
 */
export function compareTransactionTime(a: Dated, b: Dated): number {
  return (
    String(a.date).localeCompare(String(b.date)) ||
    timeOfDay(a).localeCompare(timeOfDay(b)) ||
    String(a.created_at || "").localeCompare(String(b.created_at || ""))
  );
}

/** Newest-first comparator for transaction lists. */
export function newestTransactionFirst(a: Dated, b: Dated): number {
  return compareTransactionTime(b, a);
}
