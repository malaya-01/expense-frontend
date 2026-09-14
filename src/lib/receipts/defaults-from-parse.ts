import { todayISO } from "@/lib/format";
import { readLastSourceContainerId } from "@/lib/receipts/last-container";
import { matchExpenseSource } from "@/lib/receipts/match-container";
import type {
  CreateTransactionInput,
  FinancialContainer,
  ReceiptParseResult,
} from "@/types";

export function localPaidAt(date: string, time?: string | null): string | undefined {
  if (!date || !time) return undefined;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day, hour || 0, minute || 0, 0).toISOString();
}

export function timeFromPaidAt(paidAt?: string | null): string {
  if (!paidAt) return "";
  const value = new Date(paidAt);
  if (Number.isNaN(value.getTime())) return "";
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

export function defaultsFromReceiptParse(
  result: ReceiptParseResult | null,
  containers: FinancialContainer[] = [],
  forcedSourceId?: string,
): Partial<CreateTransactionInput> {
  const extracted = result?.extracted;
  const merchant = extracted?.merchant?.trim() || "";
  const description = extracted?.description?.trim() || merchant || "";
  const date = extracted?.date || todayISO();
  const time = extracted?.time || timeFromPaidAt(extracted?.paid_at);
  const matched =
    forcedSourceId ||
    result?.source_container_id ||
    matchExpenseSource(containers, extracted)?.id ||
    readLastSourceContainerId() ||
    "";
  return {
    type: "expense",
    amount: extracted?.amount || 0,
    description,
    date,
    category_id: result?.category_id || "",
    source_container_id: matched,
    merchant,
    currency: extracted?.currency || undefined,
    notes: extracted?.notes || "",
    payment_method: extracted?.payment_method || undefined,
    upi_vpa: extracted?.upi_vpa || undefined,
    upi_txn_id: extracted?.upi_txn_id || undefined,
    payment_status: extracted?.payment_status || undefined,
    paid_at: extracted?.paid_at || localPaidAt(date, time),
    platform: extracted?.platform || undefined,
    platform_txn_id: extracted?.platform_txn_id || undefined,
  };
}
