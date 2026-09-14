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
    note: firstParam(params, ["tn", "note"]),
    currency: (firstParam(params, ["cu", "currency"]) || "INR").toUpperCase(),
    merchantCode: firstParam(params, ["mc"]) || null,
    transactionRef: firstParam(params, ["tr", "tid"]) || null,
  };
}

function keepVpa(vpa: string): string {
  const trimmed = vpa.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return encodeURIComponent(trimmed);
  return `${encodeURIComponent(trimmed.slice(0, at))}@${encodeURIComponent(trimmed.slice(at + 1))}`;
}

function pair(key: string, value: string): string {
  if (key.toLowerCase() === "pa") return `pa=${keepVpa(value)}`;
  return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function stripParams(query: string, keys: string[]): string {
  const drop = new Set(keys.map((key) => key.toLowerCase()));
  return query
    .split("&")
    .filter((part) => {
      const key = decodeURIComponent((part.split("=")[0] || "").trim()).toLowerCase();
      return key && !drop.has(key);
    })
    .join("&");
}

/**
 * Open GPay the same way a native QR scan does: forward the scanned payload.
 * Never inject `am` from Opal — UPI apps treat third-party intents with a
 * prefilled amount as merchant payments and banks reject even ₹1.
 * Personal QRs (no merchant code) also have `am` / `mode` stripped.
 */
export function buildUpiPayUri(input: {
  vpa: string;
  payeeName?: string;
  note?: string;
  raw?: string;
}): string {
  const raw = String(input.raw || "").trim();
  const queryIndex = raw.indexOf("?");
  if (queryIndex >= 0 && /^(upi|tez|phonepe):/i.test(raw)) {
    let query = raw.slice(queryIndex + 1).replace(/#Intent.*$/i, "");
    if (!/(^|&)mc=/i.test(query)) {
      query = stripParams(query, ["am", "mode"]);
    }
    return `upi://pay?${query}`;
  }

  const parts = [pair("pa", input.vpa.trim())];
  const name = (input.payeeName || "").trim();
  if (name) parts.push(pair("pn", name.slice(0, 80)));
  parts.push(pair("cu", "INR"));
  const note = (input.note || "").trim();
  if (note) parts.push(pair("tn", note.slice(0, 80)));
  return `upi://pay?${parts.join("&")}`;
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Google Pay @ok* IDs and any QR without a merchant code are P2P, not shop intent. */
export function isPersonalUpiPayee(parsed: ParsedUpiQr): boolean {
  if (parsed.merchantCode) return false;
  const handle = (parsed.vpa.split("@")[1] || "").toLowerCase();
  if (handle.startsWith("ok")) return true;
  return !parsed.amount;
}
