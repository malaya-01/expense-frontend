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
  }, [releasePreview]);

  const value = useMemo(
    () => ({
      openTransactionModal,
      openEditTransactionModal,
      closeTransactionModal,
    }),
    [
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

  return (
    <TransactionModalContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onClose={closeTransactionModal}
        title={
          editing
            ? "Edit transaction"
            : draft?.defaults
              ? "Review receipt"
              : "New transaction"
        }
        className="max-w-3xl"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={closeTransactionModal}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              form="transaction-modal-form"
              type="submit"
              loading={busy}
            >
              {editing ? "Save changes" : "Record transaction"}
            </Button>
          </>
        }
      >
        {draft?.previewUrl && !/\.pdf$/i.test(draft.previewName || "") ? (
          <div className="mb-4 overflow-hidden rounded-[10px] bg-[var(--ds-background-100)]">
            {/* Local preview only — never uploaded for storage. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.previewUrl}
              alt={draft.previewName || "Receipt preview"}
              className="max-h-40 w-full object-contain"
            />
          </div>
        ) : null}
        <VisionSourceBadge
          provider={draft?.visionProvider}
          model={draft?.visionModel}
        />
        {draft?.notice ? (
          <p className="mb-3 text-sm text-[var(--ds-gray-700)]">{draft.notice}</p>
        ) : null}
        {user ? (
          <TransactionForm
            key={formKey}
            userId={user.id}
            initial={editing}
            defaults={draft?.defaults}
            fromReceipt={Boolean(draft?.fromReceipt)}
            receiptMatch={draft?.receiptMatch}
            allowReceiptUpload={!editing && !draft?.fromReceipt}
            mode={editing ? "edit" : "create"}
            onSuccess={handleCreated}
            onCancel={closeTransactionModal}
            formId="transaction-modal-form"
            hideActions
            onBusyChange={setBusy}
          />
        ) : null}
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
