"use client";

import {
  ArrowLeftRight,
  CalendarDays,
  CreditCard,
  Hash,
  Landmark,
  NotebookPen,
  Pencil,
  Store,
  Tags,
  Trash2,
  Wallet,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { Badge } from "@/components/ui/feedback";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/format";
import type { LedgerTransaction } from "@/types";

const TYPE_TONE = {
  expense: "orange" as const,
  income: "green" as const,
  transfer: "blue" as const,
};

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-3 rounded-[12px] bg-[var(--ds-background-100)] px-3 py-2.5">
      <Icon
        size={15}
        className="mt-0.5 shrink-0 text-[var(--ds-gray-700)]"
        strokeWidth={1.8}
      />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ds-gray-700)]">
          {label}
        </p>
        <p className="mt-0.5 break-words text-[13px] text-[var(--ds-gray-1000)]">
          {value}
        </p>
      </div>
    </div>
  );
}

export function TransactionDetailModal({
  transaction,
  baseCurrency = "USD",
  onClose,
  onEdit,
  onDelete,
}: {
  transaction: LedgerTransaction | null;
  baseCurrency?: string;
  onClose: () => void;
  onEdit?: (transaction: LedgerTransaction) => void;
  onDelete?: (id: string) => void;
}) {
  const tx = transaction;
  const nativeCurrency = tx?.currency || "USD";
  const baseAmount = Number(tx?.amount_base ?? tx?.amount ?? 0);
  const showBase =
    Boolean(tx) && nativeCurrency.toUpperCase() !== baseCurrency.toUpperCase();
  const sign =
    tx?.type === "income" ? "+" : tx?.type === "expense" ? "−" : "";
  const flow =
    tx?.type === "transfer"
      ? `${tx.source_name || "—"} → ${tx.destination_name || "—"}`
      : tx?.type === "expense"
        ? tx.source_name || "—"
        : tx?.destination_name || "—";

  return (
    <Modal
      open={Boolean(transaction)}
      onClose={onClose}
      className="max-w-lg"
      title="Transaction"
      footer={
        <>
          {onDelete && tx ? (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => onDelete(tx.id)}
            >
              <Trash2 size={14} />
              Delete
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {onEdit && tx ? (
            <Button
              onClick={() => {
                onClose();
                onEdit(tx);
              }}
            >
              <Pencil size={14} />
              Edit
            </Button>
          ) : null}
        </>
      }
    >
        {tx ? (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[18px] bg-[var(--ds-background-100)] p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <StatusDot tone={TYPE_TONE[tx.type]} />
            <Badge tone="neutral" className="capitalize">
              {tx.type}
            </Badge>
            {tx.payment_status ? (
              <Badge tone="info" className="capitalize">
                {tx.payment_status.replace(/_/g, " ")}
              </Badge>
            ) : null}
          </div>
          <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.03em] text-[var(--ds-gray-1000)]">
            {tx.description}
          </h3>
          <p className="mt-2 text-[26px] font-semibold tabular-nums tracking-[-0.04em] text-[var(--ds-gray-1000)]">
            {sign}
            {formatCurrency(tx.amount, nativeCurrency)}
          </p>
          {showBase ? (
            <p className="mt-1 text-[12px] text-[var(--ds-gray-700)]">
              ≈ {sign}
              {formatCurrency(baseAmount, baseCurrency)}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Row icon={Store} label="Merchant" value={tx.merchant} />
          <Row icon={Tags} label="Category" value={tx.category_name} />
          <Row
            icon={tx.type === "transfer" ? ArrowLeftRight : Wallet}
            label={
              tx.type === "income"
                ? "To"
                : tx.type === "transfer"
                  ? "Flow"
                  : "From"
            }
            value={flow}
          />
          <Row
            icon={CalendarDays}
            label="Date"
            value={formatRelativeDate(tx.date)}
          />
          <Row
            icon={CreditCard}
            label="Payment method"
            value={tx.payment_method}
          />
          <Row icon={Landmark} label="Platform" value={tx.platform} />
          <Row icon={Hash} label="UPI ID" value={tx.upi_vpa} />
          <Row icon={Hash} label="UPI transaction" value={tx.upi_txn_id} />
          <Row
            icon={Hash}
            label="Platform reference"
            value={tx.platform_txn_id}
          />
          <Row icon={NotebookPen} label="Notes" value={tx.notes} />
          {tx.paid_at ? (
            <Row
              icon={CalendarDays}
              label="Paid at"
              value={new Date(tx.paid_at).toLocaleString()}
            />
          ) : null}
          <Row
            icon={CalendarDays}
            label="Recorded"
            value={tx.created_at ? formatDate(tx.created_at) : null}
          />
        </div>
      </div>
        ) : null}
    </Modal>
  );
}
