"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { QrCameraOverlay } from "@/components/payments/qr-camera-overlay";
import { TRANSACTION_CREATED_EVENT } from "@/components/expenses/transaction-modal-provider";
import { isUpiPayableType } from "@/lib/accounts/types-meta";
import { listCategories } from "@/lib/api/categories";
import {
  createTransaction,
  listTransactions,
  updateTransaction,
} from "@/lib/api/transactions";
import { getErrorMessage } from "@/lib/api/client";
import { formatCurrency, todayISO } from "@/lib/format";
import { suggestCategoryId } from "@/lib/payments/suggest-category";
import { canUseNativeQrScan, scanUpiQrNative } from "@/lib/payments/qr-scan";
import {
  buildUpiPayUri,
  formatInr,
  parseUpiQr,
  UpiQrError,
  type ParsedUpiQr,
} from "@/lib/payments/upi-qr";
import { UpiIntent } from "@/plugins/upi-intent";
import type { UpiPayResult, UpiPayStatus } from "@/plugins/upi-intent-definitions";
import { useToast } from "@/components/ui/toast";
import type { Category, FinancialContainer, LedgerTransaction } from "@/types";

type ScanPayContextValue = {
  startScanPay: (container: FinancialContainer) => void;
};

const ScanPayContext = createContext<ScanPayContextValue | null>(null);

type Draft = {
  container: FinancialContainer;
  parsed: ParsedUpiQr;
  amount: number;
  result?: UpiPayResult;
  created?: LedgerTransaction;
  launchedAt?: number;
};

const DRAFT_KEY = "finos:upi-scan-draft";
const DRAFT_TTL_MS = 20 * 60 * 1000;

function readDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft & { launchedAt?: number };
    if (!parsed?.container?.id || !parsed.amount) return null;
    if (parsed.launchedAt && Date.now() - parsed.launchedAt > DRAFT_TTL_MS) {
      sessionStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(draft: Draft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({ ...draft, launchedAt: Date.now() }),
  );
}

function clearDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_KEY);
}

function buildNotes(parsed: ParsedUpiQr, result: UpiPayResult, paidAt: Date): string {
  const when = paidAt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return [
    parsed.note || null,
    `UPI ID: ${parsed.vpa}`,
    result.txnId ? `UPI txn: ${result.txnId}` : null,
    result.approvalRefNo ? `Approval: ${result.approvalRefNo}` : null,
    `Paid at: ${when}`,
    `Status: ${result.status}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function ScanPayProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const notify = useCallback(
    (title: string, tone: "success" | "error" | "info" | "warning" = "info") => {
      showToast({ title, tone });
    },
    [showToast],
  );
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [amountOpen, setAmountOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [activeContainer, setActiveContainer] = useState<FinancialContainer | null>(
    null,
  );

  const reset = useCallback(() => {
    setScanning(false);
    setBusy(false);
    setAmountOpen(false);
    setAmountInput("");
    setConfirmOpen(false);
    setCategoryOpen(false);
    setDraft(null);
    setCategoryId("");
    setActiveContainer(null);
    clearDraft();
  }, []);

  useEffect(() => {
    const stored = readDraft();
    if (!stored) return;
    setDraft(stored);
    setActiveContainer(stored.container);
    setConfirmOpen(true);
    void listCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const recordExpense = useCallback(
    async (next: Draft, result: UpiPayResult) => {
      const paidAt = new Date();
      const merchant = next.parsed.payeeName || next.parsed.vpa;
      const history = await listTransactions().catch(() => [] as LedgerTransaction[]);
      const categoryList =
        categories.length > 0 ? categories : await listCategories().catch(() => []);
      if (categoryList.length && !categories.length) setCategories(categoryList);

      if (result.txnId) {
        const duplicate = history.find(
          (row) => row.upi_txn_id && row.upi_txn_id === result.txnId,
        );
        if (duplicate) {
          notify("This UPI payment was already recorded.", "info");
          reset();
          return;
        }
      }

      const suggested = suggestCategoryId({
        merchant,
        note: next.parsed.note,
        categories: categoryList,
        transactions: history,
      });

      const payload = {
        type: "expense" as const,
        amount: next.amount,
        description: next.parsed.note || `UPI · ${merchant}`,
        date: todayISO(),
        source_container_id: next.container.id,
        merchant,
        currency: next.container.currency || "INR",
        notes: buildNotes(next.parsed, result, paidAt),
        payment_method: "UPI",
        upi_vpa: next.parsed.vpa,
        upi_txn_id: result.txnId || undefined,
        payment_status: result.status,
        paid_at: paidAt.toISOString(),
        category_id: suggested || undefined,
      };

      let created: LedgerTransaction;
      try {
        created = await createTransaction(payload);
      } catch (err) {
        const message = getErrorMessage(err, "");
        const whitelist =
          /property |should not exist|whitelist|unknown/i.test(message);
        if (!whitelist) throw err;
        created = await createTransaction({
          type: payload.type,
          amount: payload.amount,
          description: payload.description,
          date: payload.date,
          source_container_id: payload.source_container_id,
          merchant: payload.merchant,
          currency: payload.currency,
          notes: payload.notes,
          category_id: payload.category_id,
        });
      }

      window.dispatchEvent(new Event(TRANSACTION_CREATED_EVENT));
      if (suggested) {
        notify(`Recorded ${formatInr(next.amount)} at ${merchant}.`, "success");
        reset();
        return;
      }
      setDraft({ ...next, result, created });
      setCategoryId("");
      setCategoryOpen(true);
      notify("Payment recorded. Choose a category.", "success");
    },
    [categories, reset, notify],
  );

  const launchPay = useCallback(
    async (next: Draft) => {
      setAmountOpen(false);
      setScanning(false);
      setBusy(true);
      writeDraft(next);
      const uri = buildUpiPayUri({
        vpa: next.parsed.vpa,
        payeeName: next.parsed.payeeName,
        amount: next.amount,
        note: next.parsed.note,
        reference: `OPAL${Date.now().toString(36).toUpperCase()}`,
      });
      try {
        const result = await UpiIntent.pay({ uri });
        const status = (result?.status || "UNKNOWN") as UpiPayStatus;
        if (status === "SUCCESS") {
          await recordExpense(next, { ...result, status });
          return;
        }
        if (status === "FAILURE") {
          notify("UPI payment failed. Nothing was recorded.", "error");
          reset();
          return;
        }
        if (status === "CANCELLED") {
          notify("Payment cancelled. Nothing was recorded.", "info");
          reset();
          return;
        }
        setDraft({ ...next, result: { ...result, status } });
        setConfirmOpen(true);
      } catch (err) {
        notify(getErrorMessage(err, "Could not open a UPI app."), "error");
        reset();
      } finally {
        setBusy(false);
      }
    },
    [recordExpense, reset, notify],
  );

  const handleParsed = useCallback(
    async (container: FinancialContainer, parsed: ParsedUpiQr) => {
      const next: Draft = {
        container,
        parsed,
        amount: parsed.amount || 0,
      };
      setDraft(next);
      if (parsed.amount && parsed.amount > 0) {
        await launchPay(next);
        return;
      }
      setBusy(false);
      setScanning(false);
      setAmountInput("");
      setAmountOpen(true);
    },
    [launchPay],
  );

  const consumeRaw = useCallback(
    async (container: FinancialContainer, raw: string) => {
      try {
        const parsed = parseUpiQr(raw);
        await handleParsed(container, parsed);
      } catch (err) {
        const message =
          err instanceof UpiQrError
            ? err.message
            : getErrorMessage(err, "Could not read that QR.");
        notify(message, "error");
        setBusy(false);
        setScanning(false);
      }
    },
    [handleParsed, notify],
  );

  const startScanPay = useCallback(
    (container: FinancialContainer) => {
      if (!isUpiPayableType(container.type)) {
        notify("Scan & Pay works from a bank, wallet, or credit card.", "error");
        return;
      }
      if ((container.currency || "").toUpperCase() !== "INR") {
        notify("UPI Scan & Pay is only available for INR accounts.", "error");
        return;
      }
      setActiveContainer(container);
      setDraft(null);
      void listCategories()
        .then(setCategories)
        .catch(() => setCategories([]));

      if (canUseNativeQrScan()) {
        setBusy(true);
        void scanUpiQrNative()
          .then((raw) => consumeRaw(container, raw))
          .catch(() => {
            setBusy(false);
            setScanning(true);
          });
        return;
      }
      setScanning(true);
    },
    [consumeRaw, notify],
  );

  const saveCategory = useCallback(async () => {
    if (!draft?.created || !categoryId) {
      reset();
      return;
    }
    setBusy(true);
    try {
      await updateTransaction(draft.created.id, { category_id: categoryId });
      window.dispatchEvent(new Event(TRANSACTION_CREATED_EVENT));
      notify("Category saved.", "success");
    } catch (err) {
      notify(getErrorMessage(err, "Payment recorded, but category was not saved."), "error");
    } finally {
      reset();
    }
  }, [categoryId, draft, reset, notify]);

  const value = useMemo(() => ({ startScanPay }), [startScanPay]);
  const payee = draft?.parsed.payeeName || draft?.parsed.vpa || "merchant";

  return (
    <ScanPayContext.Provider value={value}>
      {children}
      <QrCameraOverlay
        open={scanning}
        onClose={() => setScanning(false)}
        onScan={(raw) => {
          if (!activeContainer) return;
          setScanning(false);
          void consumeRaw(activeContainer, raw);
        }}
      />
      <Modal
        open={amountOpen}
        onClose={() => {
          setAmountOpen(false);
          reset();
        }}
        title="Enter amount"
        className="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={reset} disabled={busy}>
              Cancel
            </Button>
            <Button
              loading={busy}
              onClick={() => {
                const amount = Number(amountInput);
                if (!draft || !Number.isFinite(amount) || amount <= 0) {
                  notify("Enter a valid amount.", "error");
                  return;
                }
                void launchPay({ ...draft, amount });
              }}
            >
              Pay with UPI
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-[12px] bg-[var(--ds-gray-100)] px-3 py-3">
            <p className="text-xs text-[var(--ds-gray-700)]">Paying from</p>
            <p className="text-sm font-semibold text-[var(--ds-gray-1000)]">
              {draft?.container.name}
            </p>
            <p className="mt-2 text-xs text-[var(--ds-gray-700)]">Payee</p>
            <p className="text-sm font-semibold text-[var(--ds-gray-1000)]">{payee}</p>
            <p className="mt-1 text-xs text-[var(--ds-gray-700)]">{draft?.parsed.vpa}</p>
          </div>
          <div>
            <Label htmlFor="upi-amount">Amount (INR)</Label>
            <Input
              id="upi-amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
            />
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmOpen}
        title="Did the UPI payment succeed?"
        description={`The UPI app did not return a clear status for ${formatInr(draft?.amount || 0)} to ${payee}. Record it only if money actually left your account.`}
        confirmLabel="Yes, record expense"
        onClose={() => {
          setConfirmOpen(false);
          reset();
        }}
        onConfirm={async () => {
          if (!draft) return;
          setBusy(true);
          try {
            await recordExpense(draft, {
              ...(draft.result || {}),
              status: "SUCCESS",
            });
          } catch (err) {
            notify(getErrorMessage(err, "Could not record the expense."), "error");
            reset();
          } finally {
            setBusy(false);
            setConfirmOpen(false);
          }
        }}
      />
      <Modal
        open={categoryOpen}
        onClose={reset}
        title="Choose a category"
        className="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={reset} disabled={busy}>
              Skip
            </Button>
            <Button loading={busy} onClick={() => void saveCategory()} disabled={!categoryId}>
              Save category
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--ds-gray-800)]">
            {draft
              ? `${formatCurrency(draft.amount, draft.container.currency)} at ${payee} is recorded. Pick a category, or skip.`
              : "Pick a category."}
          </p>
          <div>
            <Label htmlFor="upi-category">Category</Label>
            <Select
              id="upi-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Select category</option>
              {categories
                .filter((category) => !/income|salary|freelance/i.test(category.name))
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </Select>
          </div>
        </div>
      </Modal>
      {busy && !amountOpen && !categoryOpen && !confirmOpen && !scanning ? (
        <div className="fixed inset-0 z-[125] grid place-items-center bg-black/45">
          <div className="flex items-center gap-2 rounded-[14px] bg-[var(--ds-background-elevated)] px-4 py-3 text-sm font-medium text-[var(--ds-gray-1000)] ds-border">
            <QrCode size={16} />
            {draft?.amount
              ? `Opening UPI for ${formatInr(draft.amount)}…`
              : "Opening scanner…"}
          </div>
        </div>
      ) : null}
    </ScanPayContext.Provider>
  );
}

export function useScanPay() {
  const context = useContext(ScanPayContext);
  if (!context) {
    throw new Error("useScanPay must be used inside ScanPayProvider");
  }
  return context;
}
