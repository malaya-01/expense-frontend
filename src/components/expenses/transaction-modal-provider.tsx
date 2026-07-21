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
import { TransactionForm } from "@/components/expenses/transaction-form";
import { useAuth } from "@/lib/auth-context";

type TransactionModalContextValue = {
  openTransactionModal: () => void;
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

  const openTransactionModal = useCallback(() => {
    setFormKey((key) => key + 1);
    setOpen(true);
  }, []);

  const closeTransactionModal = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openTransactionModal, closeTransactionModal }),
    [closeTransactionModal, openTransactionModal],
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
        title="New transaction"
        className="max-w-2xl"
      >
        {user ? (
          <TransactionForm
            key={formKey}
            userId={user.id}
            mode="create"
            onSuccess={handleCreated}
            onCancel={closeTransactionModal}
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
