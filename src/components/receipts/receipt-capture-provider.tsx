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
import { Camera, ImageUp, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useGlobalLoader } from "@/components/brand/global-loader";
import { useTransactionModal } from "@/components/expenses/transaction-modal-provider";
import { parseReceipt } from "@/lib/api/ai";
import { listAccounts } from "@/lib/api/accounts";
import { listTransactions } from "@/lib/api/transactions";
import { getErrorMessage } from "@/lib/api/client";
import { fileToReceiptPayload } from "@/lib/receipts/compress-image";
import {
  defaultsFromReceiptParse,
  isBlockedReceiptParse,
} from "@/lib/receipts/defaults-from-parse";
import { readLastSourceContainerId } from "@/lib/receipts/last-container";
import { ShareReceipt } from "@/plugins/share-receipt";
import type { SharedReceiptPayload } from "@/plugins/share-receipt-definitions";
import { useToast } from "@/components/ui/toast";
import type { ReceiptParseResult } from "@/types";

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

export function ReceiptCaptureProvider({ children }: { children: ReactNode }) {
  const { openTransactionModal } = useTransactionModal();
  const { show: showGlobalLoader } = useGlobalLoader();
  const { showToast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const sourceRef = useRef<string>("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const handlingShareRef = useRef(false);

  const ingestFile = useCallback(
    async (file: File, sourceContainerId?: string) => {
      setBusy(true);
      showGlobalLoader("Reading receipt");
      let previewUrl = "";
      try {
        const payload = await fileToReceiptPayload(file);
        previewUrl = payload.preview_url;
        let parsed: ReceiptParseResult | null = null;
        let notice =
          "Review the fields before saving. The receipt file is not stored.";
        try {
          parsed = await parseReceipt({
            name: payload.name,
            mime_type: payload.mime_type,
            data_base64: payload.data_base64,
          });
          if (parsed.warning) notice = parsed.warning;
        } catch (err) {
          notice = getErrorMessage(
            err,
            "Could not read this receipt. Fill the form yourself — the file was not saved.",
          );
        }

        if (isBlockedReceiptParse(parsed)) {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          showToast({
            title:
              parsed.blocked_reason === "pending_payment"
                ? "Payment still pending"
                : "Failed payment ignored",
            description:
              parsed.warning ||
              "This receipt was not turned into a transaction.",
            tone: "error",
          });
          return;
        }

        const dupId =
          parsed?.extracted?.upi_txn_id || parsed?.extracted?.platform_txn_id;
        if (dupId) {
          try {
            const rows = await listTransactions();
            const dup = rows.some(
              (row) =>
                (row.upi_txn_id && row.upi_txn_id === parsed?.extracted.upi_txn_id) ||
                (row.platform_txn_id &&
                  row.platform_txn_id === parsed?.extracted.platform_txn_id),
            );
            if (dup) {
              notice = `${notice} This payment reference already exists in your ledger.`;
            }
          } catch {
            /* ignore duplicate lookup failures */
          }
        }

        let accounts: Awaited<ReturnType<typeof listAccounts>> = [];
        try {
          accounts = await listAccounts();
        } catch {
          accounts = [];
        }
        const forced = sourceContainerId || parsed?.source_container_id || undefined;

        openTransactionModal({
          defaults: defaultsFromReceiptParse(parsed, accounts, forced),
          receiptMatch: parsed?.extracted,
          fromReceipt: true,
          visionProvider: parsed?.used_provider,
          visionModel: parsed?.used_model,
          notice,
          previewUrl,
          previewName: payload.name,
        });
      } catch (err) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        showToast({
          title: "Could not open this receipt",
          description: getErrorMessage(err, "Try another photo, PDF, or screenshot."),
          tone: "error",
        });
      } finally {
        setBusy(false);
        showGlobalLoader(null);
        setPickerOpen(false);
      }
    },
    [openTransactionModal, showGlobalLoader, showToast],
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
        className="max-w-lg"
      >
        <div className="overflow-hidden rounded-[18px] bg-[var(--ds-background-100)] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ds-gray-700)]">
            <Sparkles size={13} className="text-[var(--ds-focus-color)]" />
            Capture
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--ds-gray-900)]">
            Pay in GPay, PhonePe, or anywhere else, then photograph the receipt
            or pick a screenshot/PDF. Opal reads it with vision — you review and
            save. Failed payments are ignored. The file is not stored.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="group rounded-[18px] bg-[var(--ds-background-100)] p-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--ds-focus-color)_8%,var(--ds-background-100))] ds-focus"
          >
            <span className="flex size-11 items-center justify-center rounded-[14px] bg-[color-mix(in_srgb,var(--ds-focus-color)_14%,transparent)] text-[var(--ds-focus-color)]">
              <Camera size={20} strokeWidth={1.7} />
            </span>
            <span className="mt-3 block text-[14px] font-semibold text-[var(--ds-gray-1000)]">
              Take photo
            </span>
            <span className="mt-1 block text-[12px] leading-5 text-[var(--ds-gray-700)]">
              Use the camera for a live bill or UPI screen.
            </span>
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="rounded-[18px] bg-[var(--ds-background-100)] p-4 text-left transition-colors hover:bg-[var(--ds-gray-100)] ds-focus"
          >
            <span className="flex size-11 items-center justify-center rounded-[14px] bg-[var(--ds-gray-100)] text-[var(--ds-gray-1000)]">
              <ImageUp size={20} strokeWidth={1.7} />
            </span>
            <span className="mt-3 block text-[14px] font-semibold text-[var(--ds-gray-1000)]">
              Choose from gallery
            </span>
            <span className="mt-1 block text-[12px] leading-5 text-[var(--ds-gray-700)]">
              Screenshots, PDFs, and saved payment receipts.
            </span>
          </button>
        </div>
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
