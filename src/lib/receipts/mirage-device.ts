import { parseReceipt } from "@/lib/api/ai";
import { fileToReceiptPayload } from "@/lib/receipts/compress-image";
import { fieldsFromMirageOcr } from "@/lib/receipts/mirage-ocr";
import type { ReceiptExtractedFields, ReceiptParseResult } from "@/types";

const MODEL_URL =
  "https://huggingface.co/Cactus-Compute/mirage/resolve/main/mirage.cact";
const MODEL_CACHE = "finos-mirage-v1";
const PROMPT_KEY = "finos.mirage-receipt.v1";
const INFERENCE_MS = 12_000;
const MAX_EDGE = 1280;
const MIN_WIDTH = 720;
const MAX_PIXELS = 900_000;

export type StoredReceipt = {
  id: string;
  url: string | null;
  mime: string;
};

export type ReceiptRead = {
  parsed: ReceiptParseResult;
  previewUrl: string;
  previewName: string;
  stored: Promise<StoredReceipt | null>;
};

type Waiter = {
  resolve: (text: string) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let nextId = 1;
const waiters = new Map<number, Waiter>();

function emptyExtracted(): ReceiptExtractedFields {
  return {
    merchant: null,
    description: null,
    amount: null,
    currency: null,
    date: null,
    time: null,
    paid_at: null,
    payment_method: null,
    payment_status: null,
    transaction_type: null,
    upi_vpa: null,
    upi_txn_id: null,
    platform: null,
    platform_txn_id: null,
    notes: null,
    category_name: null,
    container_name: null,
    bank_name: null,
    account_last4: null,
    account_label: null,
    destination_container_name: null,
    destination_bank_name: null,
    destination_account_last4: null,
    destination_account_label: null,
  };
}

function dtoStatus(status: string | null): string | null {
  if (status === "success") return "SUCCESS";
  if (status === "failed") return "FAILURE";
  if (status === "pending") return "SUBMITTED";
  return null;
}

export async function isMirageDownloaded(): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const cache = await caches.open(MODEL_CACHE);
    const hit = await cache.match(MODEL_URL);
    return Boolean(hit);
  } catch {
    return false;
  }
}

export function dismissMiragePrompt(): void {
  try {
    localStorage.setItem(PROMPT_KEY, "dismissed");
  } catch {
    /* private mode */
  }
}

export async function miragePromptState(): Promise<"offer" | "ready" | "hidden"> {
  if (await isMirageDownloaded()) return "ready";
  try {
    if (localStorage.getItem(PROMPT_KEY) === "dismissed") return "hidden";
  } catch {
    return "hidden";
  }
  return "offer";
}

function markReady() {
  try {
    localStorage.setItem(PROMPT_KEY, "ready");
  } catch {
    /* private mode */
  }
}

async function readBody(
  response: Response,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Uint8Array> {
  const total = Number(response.headers.get("content-length") || 0);
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    onProgress?.(bytes.byteLength, total || bytes.byteLength);
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.byteLength;
      onProgress?.(loaded, total);
    }
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** Download mirage.cact into this phone's cache. About 22 MB, once. */
export async function downloadMirageModel(
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  const existing = await isMirageDownloaded();
  if (!existing) {
    const response = await fetch(MODEL_URL);
    if (!response.ok) throw new Error("Could not download the receipt reader");
    const bytes = await readBody(response, onProgress);
    if (bytes.byteLength < 1_000_000) {
      throw new Error("The download was incomplete. Try again.");
    }
    const cache = await caches.open(MODEL_CACHE);
    const body = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    await cache.put(
      MODEL_URL,
      new Response(body, {
        headers: { "content-type": "application/octet-stream" },
      }),
    );
  }
  markReady();
  getWorker().postMessage({ type: "warm" });
}

function getWorker(): Worker {
  if (worker) return worker;
  const next = new Worker("/mirage/receipt-worker.js");
  next.onmessage = (event: MessageEvent) => {
    const data = event.data || {};
    if (data.id == null) return;
    const waiter = waiters.get(data.id);
    if (!waiter) return;
    waiters.delete(data.id);
    if (data.type === "result") waiter.resolve(String(data.text || ""));
    else waiter.reject(new Error(data.message || "Mirage failed"));
  };
  next.onerror = () => {
    for (const waiter of waiters.values()) {
      waiter.reject(new Error("Mirage stopped"));
    }
    waiters.clear();
    worker = null;
  };
  worker = next;
  return next;
}

function describe(rgb: Uint8Array, width: number, height: number): Promise<string> {
  const id = nextId++;
  const buffer = rgb.buffer.slice(rgb.byteOffset, rgb.byteOffset + rgb.byteLength);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      waiters.delete(id);
      reject(new Error("On-phone read took too long"));
    }, INFERENCE_MS);
    waiters.set(id, {
      resolve: (text) => {
        clearTimeout(timer);
        resolve(text);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      },
    });
    getWorker().postMessage({ type: "describe", id, rgb: buffer, width, height }, [
      buffer,
    ]);
  });
}

function fitScale(width: number, height: number): number {
  let scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  if (width * scale < MIN_WIDTH && width > MIN_WIDTH) {
    scale = MIN_WIDTH / width;
  }
  const pixels = width * height * scale * scale;
  if (pixels > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / pixels);
  return scale;
}

async function rgbFromFile(file: File): Promise<{
  rgb: Uint8Array;
  width: number;
  height: number;
  jpeg: Blob;
} | null> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return null;
  const bitmap = await createImageBitmap(file);
  try {
    const scale = fitScale(bitmap.width, bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    const rgb = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < pixels.length; i += 4) {
      rgb[j++] = pixels[i];
      rgb[j++] = pixels[i + 1];
      rgb[j++] = pixels[i + 2];
    }
    const jpeg = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.82);
    });
    if (!jpeg) return null;
    return { rgb, width, height, jpeg };
  } finally {
    bitmap.close();
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read this file"));
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

function resultFromText(text: string): ReceiptParseResult | null {
  const fields = fieldsFromMirageOcr(text);
  if (!fields?.amount) return null;
  const blocked =
    fields.payment_status === "failed"
      ? "failed_payment"
      : fields.payment_status === "pending"
        ? "pending_payment"
        : undefined;
  return {
    ok: !blocked,
    stored: false,
    warning:
      blocked === "failed_payment"
        ? "This looks like a failed payment. It was not added as a transaction."
        : blocked === "pending_payment"
          ? "This payment is still pending. Wait for success before adding it."
          : "Read on this phone. Review before saving.",
    blocked_reason: blocked,
    used_provider: "Mirage",
    used_model: "cactus/mirage",
    category_id: null,
    category_name: null,
    source_container_id: null,
    destination_container_id: null,
    extracted: {
      ...emptyExtracted(),
      merchant: fields.merchant,
      description: fields.description,
      amount: fields.amount,
      currency: fields.currency,
      date: fields.date,
      time: fields.time,
      payment_status: dtoStatus(fields.payment_status),
      transaction_type: fields.transaction_type,
    },
  };
}

function storedFrom(parsed: ReceiptParseResult, mime: string): StoredReceipt | null {
  if (!parsed.receipt_id) return null;
  return {
    id: parsed.receipt_id,
    url: parsed.receipt_url || null,
    mime,
  };
}

/**
 * Read a receipt on the phone when Mirage is downloaded. Otherwise use the
 * vision API. `stored` finishes the file upload without blocking the fields.
 */
export async function readReceiptForForm(
  file: File,
  options?: {
    signal?: AbortSignal;
    onUploadProgress?: (fraction: number) => void;
  },
): Promise<ReceiptRead> {
  const onDevice = await isMirageDownloaded();
  if (!onDevice) {
    const payload = await fileToReceiptPayload(file);
    const parsed = await parseReceipt(payload, options);
    return {
      parsed,
      previewUrl: payload.preview_url,
      previewName: payload.name,
      stored: Promise.resolve(storedFrom(parsed, payload.mime_type)),
    };
  }

  const prepared = await rgbFromFile(file).catch(() => null);
  if (prepared) {
    try {
      const text = await describe(prepared.rgb, prepared.width, prepared.height);
      const parsed = resultFromText(text);
      if (parsed) {
        const previewUrl = URL.createObjectURL(file);
        const name = (file.name || "receipt").replace(/\.[^.]+$/, "") + ".jpg";
        const stored = blobToBase64(prepared.jpeg)
          .then((data_base64) =>
            parseReceipt(
              {
                name,
                mime_type: "image/jpeg",
                data_base64,
                store_only: true,
              },
              options,
            ),
          )
          .then((saved) => storedFrom(saved, "image/jpeg"))
          .catch(() => null);
        return { parsed, previewUrl, previewName: name, stored };
      }
    } catch {
      /* fall through to the vision API */
    }
  }

  const payload = await fileToReceiptPayload(file);
  const parsed = await parseReceipt(payload, options);
  return {
    parsed,
    previewUrl: payload.preview_url,
    previewName: payload.name,
    stored: Promise.resolve(storedFrom(parsed, payload.mime_type)),
  };
}
