import { todayISO } from "@/lib/format";
import { readLastSourceContainerId } from "@/lib/receipts/last-container";
import { matchExpenseSource } from "@/lib/receipts/match-container";
import type {
  CreateTransactionInput,
  FinancialContainer,
  ReceiptParseResult,
  TransactionType,
} from "@/types";

/**
 * Build paid_at from the receipt's printed wall-clock date/time in the
 * browser's local timezone. Never trust a server-built ISO that used UTC.
 */
export function localPaidAt(date: string, time?: string | null): string | undefined {
  if (!date || !time) return undefined;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (!year || !month || !day) return undefined;
  if (
    hour == null ||
    minute == null ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return undefined;
  }
  return new Date(year, month - 1, day, hour || 0, minute || 0, 0).toISOString();
}

/** Prefer HH:mm already extracted from the receipt over re-parsing paid_at. */
export function timeFromPaidAt(paidAt?: string | null): string {
  if (!paidAt) return "";
  // Offset-aware ISO from the parser (…+05:30) — use the printed wall clock.
  const offsetMatch = paidAt.match(
    /T(\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?([+-]\d{2}:?\d{2}|Z)?$/i,
  );
  if (offsetMatch?.[3] && offsetMatch[3].toUpperCase() !== "Z") {
    return `${offsetMatch[1]}:${offsetMatch[2]}`;
  }
  const value = new Date(paidAt);
  if (Number.isNaN(value.getTime())) return "";
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function resolveType(result: ReceiptParseResult | null): TransactionType {
  const raw = result?.extracted?.transaction_type;
  if (raw === "income" || raw === "transfer" || raw === "expense") return raw;
  return "expense";
}

export function defaultsFromReceiptParse(
  result: ReceiptParseResult | null,
  containers: FinancialContainer[] = [],
  forcedSourceId?: string,
): Partial<CreateTransactionInput> {
  const extracted = result?.extracted;
  let type = resolveType(result);
  const merchant = extracted?.merchant?.trim() || "";
  let description = extracted?.description?.trim() || merchant || "";
  const date = extracted?.date || todayISO();
  const time = extracted?.time || timeFromPaidAt(extracted?.paid_at);

  const sourceHint = {
    container_name: extracted?.container_name,
    bank_name: extracted?.bank_name,
    account_last4: extracted?.account_last4,
    account_label: extracted?.account_label || extracted?.payment_method,
  };
  const destinationHint = {
    container_name: extracted?.destination_container_name,
    bank_name: extracted?.destination_bank_name,
    account_last4: extracted?.destination_account_last4,
    account_label: extracted?.destination_account_label,
  };

  let sourceMatched =
    forcedSourceId ||
    result?.source_container_id ||
    matchExpenseSource(containers, sourceHint)?.id ||
    "";

  let destinationMatched =
    result?.destination_container_id ||
    matchExpenseSource(containers, destinationHint, {
      excludeIds: sourceMatched ? [sourceMatched] : [],
    })?.id ||
    "";

  // Two distinct own accounts on the receipt → treat as transfer.
  if (
    sourceMatched &&
    destinationMatched &&
    sourceMatched !== destinationMatched &&
    type === "expense"
  ) {
    type = "transfer";
  }

  if (type === "income" && !destinationMatched && sourceMatched) {
    destinationMatched = sourceMatched;
    sourceMatched = "";
  }

  if (
    (type === "expense" || type === "transfer") &&
    !sourceMatched
  ) {
    sourceMatched = readLastSourceContainerId() || "";
  }

  if (
    type === "transfer" &&
    sourceMatched &&
    destinationMatched &&
    sourceMatched === destinationMatched
  ) {
    destinationMatched = "";
  }

  if (
    type === "transfer" &&
    (!description || /^self$/i.test(description))
  ) {
    const fromName = containers.find((c) => c.id === sourceMatched)?.name;
    const toName = containers.find((c) => c.id === destinationMatched)?.name;
    description =
      fromName && toName
        ? `Transfer · ${fromName} → ${toName}`
        : "Account transfer";
  }

  return {
    type,
    amount: extracted?.amount || 0,
    description,
    date,
    category_id: result?.category_id || "",
    source_container_id: type === "income" ? "" : sourceMatched,
    destination_container_id: type === "expense" ? "" : destinationMatched,
    merchant:
      type === "transfer" && /^self$/i.test(merchant) ? "" : merchant,
    currency: extracted?.currency || undefined,
    notes: extracted?.notes || "",
    payment_method: extracted?.payment_method || undefined,
    upi_vpa: extracted?.upi_vpa || undefined,
    upi_txn_id: extracted?.upi_txn_id || undefined,
    payment_status: extracted?.payment_status || undefined,
    // Always rebuild in the browser so server UTC does not shift the clock.
    paid_at: localPaidAt(date, time),
    platform: extracted?.platform || undefined,
    platform_txn_id: extracted?.platform_txn_id || undefined,
  };
}

export type BlockedReceiptParseResult = ReceiptParseResult & {
  blocked_reason: "failed_payment" | "pending_payment";
};

export function isBlockedReceiptParse(
  result: ReceiptParseResult | null | undefined,
): result is BlockedReceiptParseResult {
  return (
    result?.blocked_reason === "failed_payment" ||
    result?.blocked_reason === "pending_payment"
  );
}
