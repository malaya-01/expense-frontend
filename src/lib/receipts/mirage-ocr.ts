export type OnDeviceReceipt = {
  merchant: string | null;
  amount: number | null;
  currency: string | null;
  date: string | null;
  time: string | null;
  payment_status: "success" | "failed" | "pending" | null;
  transaction_type: "expense" | "income" | "transfer" | null;
  description: string | null;
};

const FAILED_RE =
  /\b(fail(?:ed|ure)?|declin(?:ed|e)|unsuccessful|not\s+successful|rejected|cancelled|canceled)\b/i;
const PENDING_RE = /\b(pending|processing|in\s+progress|awaiting)\b/i;
const INCOME_RE =
  /\b(received|credited|refund|salary|money\s+received)\b/i;
const TRANSFER_RE =
  /\b(self\s*transfer|paid\s+to\s*self|to\s+self|own\s+account)\b/i;
const TOTAL_RE =
  /\b(grand\s*total|amount\s*paid|net\s*(?:amount|payable)|total\s*payable|you\s*paid|bill\s*amount)\b/i;
const PAID_RE = /\b(total|paid|debited|amount)\b/i;
const STATUS_LINE_RE =
  /^(payment\s+)?(successful|success|failed|pending|done|paid|debited|credited|upi|google\s*pay|phonepe|paytm|bhim)$/i;

function cleanAmount(whole: string, fraction?: string): number | null {
  const digits = whole.replace(/,/g, "");
  if (digits.length >= 10) return null;
  const value = Number(fraction ? `${digits}.${fraction}` : digits);
  if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) return null;
  return Math.round(value * 100) / 100;
}

function amountsOnLine(line: string): number[] {
  const found: number[] = [];
  const re =
    /(?:₹|\brs\.?\b|\binr\b)?\s*(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d{1,2}))?/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line))) {
    const amount = cleanAmount(match[1], match[2]);
    if (amount != null) found.push(amount);
  }
  return found;
}

function pickAmount(lines: string[]): number | null {
  let best: { amount: number; score: number; index: number } | null = null;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const amounts = amountsOnLine(line);
    if (!amounts.length) continue;
    const score = TOTAL_RE.test(line) ? 5 : PAID_RE.test(line) || /₹/.test(line) ? 3 : 1;
    for (const amount of amounts) {
      const candidate = { amount, score, index };
      if (
        !best ||
        candidate.score > best.score ||
        (candidate.score === best.score && candidate.index >= best.index)
      ) {
        best = candidate;
      }
    }
  }
  return best?.amount ?? null;
}

function pickMerchant(lines: string[]): string | null {
  for (const line of lines) {
    const text = line.replace(/\s+/g, " ").trim();
    if (text.length < 3 || text.length > 48) continue;
    if (!/[A-Za-z]{3,}/.test(text)) continue;
    if (STATUS_LINE_RE.test(text)) continue;
    if (TOTAL_RE.test(text) || PAID_RE.test(text)) continue;
    if (/[₹$€£]|\d{2}[\/.-]\d{2}/.test(text)) continue;
    return text;
  }
  return null;
}

function pickDate(text: string): string | null {
  const match = text.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (!match) return null;
  let day = Number(match[1]);
  let month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  if (day > 12 && month <= 12) {
    /* day first */
  } else if (month > 12 && day <= 12) {
    const swap = day;
    day = month;
    month = swap;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function pickTime(text: string): string | null {
  const match = text.match(/\b(\d{1,2})[:.](\d{2})\s*(am|pm)?\b/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || hour > 23) return null;
  const suffix = match[3]?.toLowerCase();
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (hour > 23) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Fields copied from Mirage's OCR. Null amount means the scan should use the API. */
export function fieldsFromMirageOcr(text: string): OnDeviceReceipt | null {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  const blob = lines.join("\n");
  const amount = pickAmount(lines);
  if (amount == null) return null;
  const payment_status = FAILED_RE.test(blob)
    ? "failed"
    : PENDING_RE.test(blob)
      ? "pending"
      : /\b(success(?:ful)?|paid|debited|completed)\b/i.test(blob)
        ? "success"
        : null;
  const transaction_type = TRANSFER_RE.test(blob)
    ? "transfer"
    : INCOME_RE.test(blob) && !/\bdebited\b/i.test(blob)
      ? "income"
      : "expense";
  const merchant = transaction_type === "transfer" ? null : pickMerchant(lines);
  const currency = /₹|\binr\b|\brs\.?\b/i.test(blob)
    ? "INR"
    : /\$|\busd\b/i.test(blob)
      ? "USD"
      : /€|\beur\b/i.test(blob)
        ? "EUR"
        : null;
  return {
    merchant,
    amount,
    currency,
    date: pickDate(blob),
    time: pickTime(blob),
    payment_status,
    transaction_type,
    description: merchant ? `${merchant}` : null,
  };
}
