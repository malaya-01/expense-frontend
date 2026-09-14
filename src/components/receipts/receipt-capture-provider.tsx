"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Camera, ImageUp, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useTransactionModal } from "@/components/expenses/transaction-modal-provider";
import { parseReceipt } from "@/lib/api/ai";
import { listTransactions } from "@/lib/api/transactions";
import { getErrorMessage } from "@/lib/api/client";
import { todayISO } from "@/lib/format";
import { fileToReceiptPayload } from "@/lib/receipts/compress-image";
import { readLastSourceContainerId } from "@/lib/receipts/last-container";
import { ShareReceipt } from "@/plugins/share-receipt";
import type { SharedReceiptPayload } from "@/plugins/share-receipt-definitions";
import { useToast } from "@/components/ui/toast";
import type { CreateTransactionInput, ReceiptParseResult } from "@/types";

type ReceiptCaptureOptions = {
  source_container_id?: string;
};

type ReceiptCaptureContextValue = {
  startReceiptCapture: (options?: ReceiptCaptureOptions) => void;
};

const ReceiptCaptureContext = createContext<ReceiptCaptureContextValue | null>(
  null,
);

function base64ToFile(payload: SharedReceiptPayload): File | null {
  const raw = payload.data_base64?.trim();
  if (!raw) return null;
  const mime = payload.mime_type || "image/jpeg";
  const name = payload.name || (mime.includes("pdf") ? "receipt.pdf" : "receipt.jpg");
  try {
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], name, { type: mime });
  } catch {
    return null;
  }
}

function defaultsFromParse(
  result: ReceiptParseResult | null,
  sourceContainerId?: string,
): Partial<CreateTransactionInput> {
  const extracted = result?.extracted;
  const merchant = extracted?.merchant?.trim() || "";
  const description =
    extracted?.description?.trim() || merchant || "";
  return {
    type: "expense",
    amount: extracted?.amount || 0,
    description,
    date: extracted?.date || todayISO(),
    category_id: result?.category_id || "",
    source_container_id:
      sourceContainerId || readLastSourceContainerId() || "",
    merchant,
    currency: extracted?.currency || undefined,
    notes: extracted?.notes || "",
    payment_method: extracted?.payment_method || undefined,
    upi_vpa: extracted?.upi_vpa || undefined,
    upi_txn_id: extracted?.upi_txn_id || undefined,
  };
}

export function ReceiptCaptureProvider({ children }: { children: ReactNode }) {
  const { openTransactionModal } = useTransactionModal();
  const { showToast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Reading receipt…");
  const sourceRef = useRef<string>("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const handlingShareRef = useRef(false);

  const ingestFile = useCallback(
    async (file: File, sourceContainerId?: string) => {
      setBusy(true);
      setBusyLabel("Preparing receipt…");
      let previewUrl = "";
      try {
        const payload = await fileToReceiptPayload(file);
        previewUrl = payload.preview_url;
        setBusyLabel("Reading with free AI…");
        let parsed: ReceiptParseResult | null = null;
        let notice =
          "Review the fields before saving. The receipt image is not stored.";
        try {
          parsed = await parseReceipt({
            name: payload.name,
            mime_type: payload.mime_type,
            data_base64: payload.data_base64,
          });
          if (parsed.used_model?.includes("gemini")) {
            notice = "Extracted with Gemini. Review before saving — the image is not stored.";
          } else if (parsed.ok) {
            notice = "Extracted with free AI. Review before saving — the image is not stored.";
          }
          if (parsed.warning) notice = parsed.warning;
        } catch (err) {
          notice = getErrorMessage(
            err,
            "Could not read this receipt. Fill the form yourself — the image was not saved.",
          );
        }

        if (parsed?.extracted?.upi_txn_id) {
          try {
            const rows = await listTransactions();
            const dup = rows.some(
              (row) =>
                row.upi_txn_id &&
                row.upi_txn_id === parsed?.extracted.upi_txn_id,
            );
            if (dup) {
              notice = `${notice} This UPI reference already exists in your ledger.`;
            }
          } catch {
            /* ignore duplicate lookup failures */
          }
        }

        openTransactionModal({
          defaults: defaultsFromParse(parsed, sourceContainerId),
          notice,
          previewUrl,
          previewName: payload.name,
        });
      } catch (err) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        showToast({
          title: "Could not open this receipt",
          description: getErrorMessage(err, "Try another photo or screenshot."),
          tone: "error",
        });
      } finally {
        setBusy(false);
        setPickerOpen(false);
      }
    },
    [openTransactionModal, showToast],
  );

  const startReceiptCapture = useCallback((options?: ReceiptCaptureOptions) => {
    sourceRef.current = options?.source_container_id || "";
    setPickerOpen(true);
  }, []);

  const onPicked = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      await ingestFile(file, sourceRef.current);
    },
    [ingestFile],
  );

  const ingestShare = useCallback(
    async (payload: SharedReceiptPayload) => {
      if (handlingShareRef.current) return;
      const file = base64ToFile(payload);
      if (!file) return;
      handlingShareRef.current = true;
      try {
        await ingestFile(file, readLastSourceContainerId());
      } finally {
        handlingShareRef.current = false;
      }
    },
    [ingestFile],
  );

  useEffect(() => {
    let removed = false;
    let handle: { remove: () => Promise<void> } | null = null;
    void (async () => {
      try {
        const pending = await ShareReceipt.consumePending();
        if (!removed) await ingestShare(pending);
        handle = await ShareReceipt.addListener("shareReceived", (next) => {
          void ingestShare(next);
        });
      } catch {
        /* web / plugin unavailable */
      }
    })();
    return () => {
      removed = true;
      void handle?.remove();
    };
  }, [ingestShare]);

  const value = useMemo(
    () => ({ startReceiptCapture }),
    [startReceiptCapture],
  );

  return (
    <ReceiptCaptureContext.Provider value={value}>
      {children}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void onPicked(file);
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void onPicked(file);
        }}
      />
      <Modal
        open={pickerOpen && !busy}
        onClose={() => setPickerOpen(false)}
        title="Scan receipt"
        className="max-w-md"
      >
        <p className="text-sm text-[var(--ds-gray-700)]">
          Pay in GPay, PhonePe, or anywhere else, then share or photograph the
          receipt. Opal fills the form — you review and save. Images are not
          stored until you set up cloud storage.
        </p>
        <div className="mt-4 grid gap-2">
          <Button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera size={15} />
            Take photo
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImageUp size={15} />
            Choose from gallery
          </Button>
        </div>
      </Modal>
      <Modal
        open={busy}
        onClose={() => undefined}
        title="Reading receipt"
        className="max-w-sm"
      >
        <div className="flex items-center gap-3 text-sm text-[var(--ds-gray-900)]">
          <ReceiptText size={18} className="shrink-0 animate-pulse" />
          <p>{busyLabel}</p>
        </div>
        <p className="mt-2 text-xs text-[var(--ds-gray-700)]">
          Free vision first, then Gemini if needed. Nothing is saved until you
          confirm the form.
        </p>
      </Modal>
    </ReceiptCaptureContext.Provider>
  );
}

export function useReceiptCapture() {
  const context = useContext(ReceiptCaptureContext);
  if (!context) {
    throw new Error("useReceiptCapture must be used inside ReceiptCaptureProvider");
  }
  return context;
}
