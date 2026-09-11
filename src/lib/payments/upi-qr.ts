export type ParsedUpiQr = {
  raw: string;
  vpa: string;
  payeeName: string;
  amount: number | null;
  note: string;
  currency: string;
  merchantCode: string | null;
  transactionRef: string | null;
};

export class UpiQrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpiQrError";
  }
}

function firstParam(params: URLSearchParams, keys: string[]): string {
  for (const key of keys) {
    const value = params.get(key) || params.get(key.toUpperCase());
    if (value && value.trim()) return value.trim();
  }
  return "";
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const amount = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

function paramsFromQuery(query: string): URLSearchParams {
  const cleaned = query.replace(/^\?/, "").replace(/#Intent.*$/i, "");
  return new URLSearchParams(cleaned);
}

/**
 * Parse a scanned UPI QR (upi://, intent://, or a bare VPA).
 * BharatQR/EMV payloads are rejected with a clear error.
 */
export function parseUpiQr(rawInput: string): ParsedUpiQr {
  const raw = String(rawInput || "").trim();
  if (!raw) throw new UpiQrError("Empty QR code.");

  if (/^000201/.test(raw)) {
    throw new UpiQrError(
      "This looks like a BharatQR / card QR. Scan a UPI QR (upi://) instead.",
    );
  }

  let params: URLSearchParams;
  const lowered = raw.toLowerCase();

  if (lowered.startsWith("upi:") || lowered.startsWith("tez:") || lowered.startsWith("phonepe:")) {
    const queryIndex = raw.indexOf("?");
    params = queryIndex >= 0 ? paramsFromQuery(raw.slice(queryIndex + 1)) : new URLSearchParams();
  } else if (lowered.startsWith("intent:")) {
    const queryIndex = raw.indexOf("?");
    const hashIndex = raw.indexOf("#");
    const query = queryIndex >= 0 ? raw.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined) : "";
    params = paramsFromQuery(query);
  } else if (raw.includes("@") && !raw.includes("://") && !raw.includes("?")) {
    params = new URLSearchParams({ pa: raw });
  } else if (raw.includes("pa=")) {
    const queryIndex = raw.indexOf("pa=");
    params = paramsFromQuery(raw.slice(queryIndex));
  } else {
    throw new UpiQrError("This QR is not a UPI payment code.");
  }

  const vpa = firstParam(params, ["pa", "vpa"]);
  if (!vpa || !vpa.includes("@")) {
    throw new UpiQrError("This UPI QR has no payee ID.");
  }

  return {
    raw,
    vpa,
    payeeName: firstParam(params, ["pn", "payeeName", "name"]),
    amount: parseAmount(firstParam(params, ["am", "amount"])),
    note: firstParam(params, ["tn", "note", "tr"]),
    currency: (firstParam(params, ["cu", "currency"]) || "INR").toUpperCase(),
    merchantCode: firstParam(params, ["mc"]) || null,
    transactionRef: firstParam(params, ["tr", "tid"]) || null,
  };
}

export function buildUpiPayUri(input: {
  vpa: string;
  payeeName?: string;
  amount: number;
  note?: string;
  reference?: string;
}): string {
  const params = new URLSearchParams();
  params.set("pa", input.vpa.trim());
  params.set("pn", (input.payeeName || "Payee").trim().slice(0, 80));
  params.set("am", input.amount.toFixed(2));
  params.set("cu", "INR");
  if (input.note?.trim()) params.set("tn", input.note.trim().slice(0, 80));
  if (input.reference?.trim()) params.set("tr", input.reference.trim().slice(0, 35));
  params.set("mode", "04");
  return `upi://pay?${params.toString()}`;
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}
