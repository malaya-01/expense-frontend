"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "@/components/expenses/transaction-form";
import { useAuth } from "@/lib/auth-context";
import type { LedgerTransaction } from "@/types";

type TransactionModalContextValue = {
  openTransactionModal: () => void;
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

  const openTransactionModal = useCallback(() => {
    setFormKey((key) => key + 1);
    setBusy(false);
    setEditing(null);
    setOpen(true);
  }, []);

  const openEditTransactionModal = useCallback(
    (transaction: LedgerTransaction) => {
      setFormKey((key) => key + 1);
      setBusy(false);
      setEditing(transaction);
      setOpen(true);
    },
    [],
  );

  const closeTransactionModal = useCallback(() => setOpen(false), []);

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
    window.dispatchEvent(new Event(TRANSACTION_CREATED_EVENT));
  }, []);

  return (
    <TransactionModalContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onClose={closeTransactionModal}
        title={editing ? "Edit transaction" : "New transaction"}
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
        {user ? (
          <TransactionForm
            key={formKey}
            userId={user.id}
            initial={editing}
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
