"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "@/components/expenses/transaction-form";
import { VisionSourceBadge } from "@/components/receipts/vision-source-badge";
import { ReceiptPreviewStage } from "@/components/receipts/receipt-preview-stage";
import { useAuth } from "@/lib/auth-context";
import type { CreateTransactionInput, LedgerTransaction } from "@/types";

export type TransactionDraft = {
  defaults?: Partial<CreateTransactionInput>;
  notice?: string;
  previewUrl?: string;
  previewName?: string;
  fromReceipt?: boolean;
  visionProvider?: string | null;
  visionModel?: string | null;
  receiptMatch?: {
    container_name?: string | null;
    bank_name?: string | null;
    account_last4?: string | null;
    account_label?: string | null;
  };
};

type TransactionModalContextValue = {
  openTransactionModal: (draft?: TransactionDraft) => void;
  openEditTransactionModal: (transaction: LedgerTransaction) => void;
  closeTransactionModal: () => void;
  attachReceiptPreview: (draft: TransactionDraft) => void;
};

const TransactionModalContext =
  createContext<TransactionModalContextValue | null>(null);

export const TRANSACTION_CREATED_EVENT = "finos:transaction-created";

export function TransactionModalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [readingLabel, setReadingLabel] = useState<string | null>(null);
  const [editing, setEditing] = useState<LedgerTransaction | null>(null);
  const [draft, setDraft] = useState<TransactionDraft | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const openTransactionModal = useCallback(
    (next?: TransactionDraft) => {
      if (previewUrlRef.current && previewUrlRef.current !== next?.previewUrl) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = next?.previewUrl || null;
      setFormKey((key) => key + 1);
      setBusy(false);
      setReadingLabel(null);
      setEditing(null);
      setDraft(next || null);
      setOpen(true);
    },
    [],
  );

  const openEditTransactionModal = useCallback(
    (transaction: LedgerTransaction) => {
      releasePreview();
      setFormKey((key) => key + 1);
      setBusy(false);
      setReadingLabel(null);
      setEditing(transaction);
      setDraft(null);
      setOpen(true);
    },
    [releasePreview],
  );

  const closeTransactionModal = useCallback(() => {
    setOpen(false);
    releasePreview();
    setDraft(null);
    setReadingLabel(null);
  }, [releasePreview]);

  const attachReceiptPreview = useCallback((next: TransactionDraft) => {
    if (previewUrlRef.current && previewUrlRef.current !== next.previewUrl) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = next.previewUrl || null;
    setDraft((prev) => ({
      ...prev,
      ...next,
      fromReceipt: true,
      defaults: next.defaults || prev?.defaults,
    }));
  }, []);

  const clearReceiptPreview = useCallback(() => {
    releasePreview();
    setDraft(null);
    setBusy(false);
    setFormKey((key) => key + 1);
  }, [releasePreview]);

  const value = useMemo(
    () => ({
      openTransactionModal,
      openEditTransactionModal,
      closeTransactionModal,
      attachReceiptPreview,
    }),
    [
      attachReceiptPreview,
      closeTransactionModal,
      openEditTransactionModal,
      openTransactionModal,
    ],
  );

  const handleCreated = useCallback(() => {
    setOpen(false);
    releasePreview();
    setDraft(null);
    window.dispatchEvent(new Event(TRANSACTION_CREATED_EVENT));
  }, [releasePreview]);

  const hasPreview = Boolean(
    draft?.previewUrl && !/\.pdf$/i.test(draft.previewName || ""),
  );

  return (
    <TransactionModalContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onClose={closeTransactionModal}
        title={editing ? "Edit transaction" : "New transaction"}
        className={hasPreview ? undefined : "max-w-3xl"}
        flushBody={hasPreview}
        wide={hasPreview}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={closeTransactionModal}
              disabled={busy || Boolean(readingLabel)}
            >
              Cancel
            </Button>
            <Button
              form="transaction-modal-form"
              type="submit"
              loading={busy}
              disabled={Boolean(readingLabel)}
            >
              {editing ? "Save changes" : "Record transaction"}
            </Button>
          </>
        }
      >
        {hasPreview ? (
          <div className="flex h-full min-h-0 flex-col sm:flex-row">
            <aside className="relative h-[min(34vh,260px)] shrink-0 overflow-hidden border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_10%,transparent)] sm:h-full sm:min-h-0 sm:w-[min(46%,540px)] sm:max-w-[540px] sm:border-b-0 sm:border-r">
              <ReceiptPreviewStage
                src={draft!.previewUrl!}
                alt={draft?.previewName || "Receipt preview"}
                fill
                caption="Preview only — nothing is stored until you record."
                onRemove={clearReceiptPreview}
              />
            </aside>
            <div className="app-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 pb-10 sm:px-10 sm:py-8 sm:pb-12 lg:px-12">
              <VisionSourceBadge
                provider={draft?.visionProvider}
                model={draft?.visionModel}
              />
              {draft?.notice ? (
                <p className="mb-6 rounded-[16px] border border-[color:color-mix(in_srgb,var(--ds-mesh-a)_18%,transparent)] bg-[color-mix(in_srgb,var(--ds-mesh-a)_7%,var(--ds-background-100))] px-4 py-3.5 text-sm leading-6 text-[var(--ds-gray-900)] sm:px-5">
                  {draft.notice}
                </p>
              ) : null}
              {user ? (
                <TransactionForm
                  key={formKey}
                  userId={user.id}
                  initial={editing}
                  defaults={draft?.defaults}
                  fromReceipt={Boolean(draft?.fromReceipt)}
                  receiptMatch={draft?.receiptMatch}
                  allowReceiptUpload={!editing && !hasPreview}
                  mode={editing ? "edit" : "create"}
                  onSuccess={handleCreated}
                  onCancel={closeTransactionModal}
                  formId="transaction-modal-form"
                  hideActions
                  onBusyChange={setBusy}
                  onReceiptReading={setReadingLabel}
                  reading={Boolean(readingLabel)}
                  onReceiptAttached={attachReceiptPreview}
                  className="space-y-5 sm:space-y-6"
                />
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <VisionSourceBadge
              provider={draft?.visionProvider}
              model={draft?.visionModel}
            />
            {draft?.notice ? (
              <p className="mb-3 text-sm leading-6 text-[var(--ds-gray-700)]">
                {draft.notice}
              </p>
            ) : null}
            {user ? (
              <TransactionForm
                key={formKey}
                userId={user.id}
                initial={editing}
                defaults={draft?.defaults}
                fromReceipt={Boolean(draft?.fromReceipt)}
                receiptMatch={draft?.receiptMatch}
                allowReceiptUpload={!editing && !hasPreview}
                mode={editing ? "edit" : "create"}
                onSuccess={handleCreated}
                onCancel={closeTransactionModal}
                formId="transaction-modal-form"
                hideActions
                onBusyChange={setBusy}
                onReceiptReading={setReadingLabel}
                reading={Boolean(readingLabel)}
                onReceiptAttached={attachReceiptPreview}
              />
            ) : null}
          </>
        )}
      </Modal>
    </TransactionModalContext.Provider>
  );
}

export function useTransactionModal() {
  const context = useContext(TransactionModalContext);
  if (!context) {
    throw new Error(
      "useTransactionModal must be used inside TransactionModalProvider",
    );
  }
  return context;
}
