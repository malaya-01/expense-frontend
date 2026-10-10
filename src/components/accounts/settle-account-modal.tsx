"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { TRANSACTION_CREATED_EVENT } from "@/components/expenses/transaction-modal-provider";
import {
  allocateAmount,
  fundingAccounts,
  joinSettlementNote,
  openEntries,
} from "@/lib/accounts/settlement";
import { createTransaction } from "@/lib/api/transactions";
import { getErrorMessage } from "@/lib/api/client";
import { formatCurrency, formatDate } from "@/lib/format";
import type { FinancialContainer, LedgerTransaction } from "@/types";

function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function SettleAccountModal({
  account,
  mode,
  accounts,
  transactions,
  onClose,
  onSaved,
}: {
  account: FinancialContainer | null;
  /** People pick the open entries. A card pays down one bill. */
  mode: "people" | "card";
  accounts: FinancialContainer[];
  transactions: LedgerTransaction[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = account?.type === "payable" || account?.type === "receivable";
  const people = mode === "people" && open;
  const entries = useMemo(
    () => (account && people ? openEntries(account, transactions) : []),
    [account, people, transactions],
  );
  const funds = useMemo(
    () => (account ? fundingAccounts(accounts, account) : []),
    [account, accounts],
  );

  const [selected, setSelected] = useState<string[]>([]);
  const [fundId, setFundId] = useState("");
  const [amountText, setAmountText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!account) return;
    setSelected([]);
    setFundId(funds[0]?.id || "");
    setError("");
    setBusy(false);
    if (mode === "card") {
      const due = Math.max(0, Number(account.balance) || 0);
      setAmountText(due > 0 ? due.toFixed(2) : "");
    } else {
      setAmountText("");
    }
  }, [account, funds, mode]);

  const chosen = entries.filter((entry) => selected.includes(entry.id));
  const chosenTotal = round2(
    chosen.reduce((sum, entry) => sum + entry.remaining, 0),
  );
  const due = Math.max(0, Number(account?.balance) || 0);
  const cap = people ? Math.min(chosenTotal, due) : due;

  const selectionKey = selected.join("|");
  useEffect(() => {
    if (!people) return;
    setAmountText(cap > 0 ? cap.toFixed(2) : "");
  }, [people, cap, selectionKey]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function submit() {
    if (!account || busy) return;
    const amount = round2(Number(amountText));
    if (!(amount > 0)) {
      setError("Enter how much this payment covers.");
      return;
    }
    if (amount - cap > 0.009) {
      setError(
        people
          ? "That is more than the entries you selected."
          : "That is more than the amount due on this card.",
      );
      return;
    }
    if (!fundId) {
      setError("Choose one of your accounts for this payment.");
      return;
    }
    if (people && !chosen.length) {
      setError("Choose the entries this payment settles.");
      return;
    }

    const fund = funds.find((item) => item.id === fundId);
    const payable = account.type === "payable";
    const slices = people
      ? allocateAmount(
          entries.filter((entry) => selected.includes(entry.id)),
          amount,
        )
      : [];
    const names = slices
      .map(
        (slice) =>
          entries.find((entry) => entry.id === slice.id)?.description || "",
      )
      .filter(Boolean);
    const description = (
      mode === "card"
        ? `${account.name} bill payment`
        : payable
          ? `Settled ${names.join(", ") || account.name}`
          : `Received from ${account.name}`
    ).slice(0, 500);

    setBusy(true);
    setError("");
    try {
      await createTransaction({
        type: "transfer",
        amount,
        description,
        date: todayISO(),
        source_container_id: payable || mode === "card" ? fundId : account.id,
        destination_container_id:
          payable || mode === "card" ? account.id : fundId,
        currency: fund?.currency || account.currency,
        notes: slices.length ? joinSettlementNote("", slices) : undefined,
      });
      window.dispatchEvent(new Event(TRANSACTION_CREATED_EVENT));
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Could not record this payment"));
      setBusy(false);
    }
  }

  const title =
    mode === "card"
      ? `Pay ${account?.name || "card"} bill`
      : `Settle ${account?.name || "account"}`;

  return (
    <Modal
      open={Boolean(account)}
      onClose={onClose}
      title={title}
      className="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            loading={busy}
            disabled={!account || cap <= 0 || !funds.length}
          >
            {mode === "card" ? "Pay bill" : "Settle"}
          </Button>
        </>
      }
    >
      {account ? (
        <div className="space-y-4">
          <p className="text-[13px] leading-5 text-[var(--ds-gray-900)]">
            {mode === "card" ? (
              <>
                A credit card is one bill, not a list of entries to tick off.
                Purchases were already recorded when you used the card. This
                payment leaves{" "}
                <span className="font-medium">an account you already have</span>{" "}
                and lowers the amount due. It is not new spending.
              </>
            ) : account.type === "payable" ? (
              <>
                These are the entries {account.name} covered for you. Pick the
                ones you are paying back. The money leaves{" "}
                <span className="font-medium">an account you already have</span>.
              </>
            ) : (
              <>
                These are the amounts you paid for {account.name} from your own
                accounts. Pick the ones they are paying back. The money arrives
                in <span className="font-medium">an account you already have</span>.
              </>
            )}
          </p>

          {people ? (
            entries.length ? (
              <ul className="max-h-[min(40vh,18rem)] space-y-1.5 overflow-y-auto overscroll-contain">
                {entries.map((entry) => {
                  const on = selected.includes(entry.id);
                  return (
                    <li key={entry.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-[12px] bg-[var(--ds-background-100)] px-3 py-2.5">
                        <input
                          type="checkbox"
                          className="mt-1 size-4 accent-[var(--ds-focus-color)]"
                          checked={on}
                          onChange={() => toggle(entry.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-[var(--ds-gray-1000)]">
                            {entry.description}
                          </span>
                          <span className="mt-0.5 block text-[12px] text-[var(--ds-gray-700)]">
                            {entry.date ? formatDate(entry.date) : "Starting balance"}
                            {entry.original - entry.remaining > 0.009
                              ? ` · ${formatCurrency(entry.original, account.currency)} originally`
                              : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-[13px] font-medium tabular-nums text-[var(--ds-gray-1000)]">
                          {formatCurrency(entry.remaining, account.currency)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-[12px] bg-[var(--ds-background-100)] px-3 py-3 text-[13px] text-[var(--ds-gray-700)]">
                Nothing is left to settle on {account.name}.
              </p>
            )
          ) : (
            <p className="rounded-[12px] bg-[var(--ds-background-100)] px-3 py-3 text-[13px] text-[var(--ds-gray-900)]">
              Amount due{" "}
              <span className="font-semibold tabular-nums">
                {formatCurrency(due, account.currency)}
              </span>
            </p>
          )}

          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-[var(--ds-gray-700)]">
              {account.type === "receivable" ? "Into your account" : "From your account"}
            </span>
            <Select
              value={fundId}
              onChange={(event) => setFundId(event.target.value)}
              disabled={!funds.length}
            >
              {funds.length ? null : (
                <option value="">No matching account</option>
              )}
              {funds.map((fund) => (
                <option key={fund.id} value={fund.id}>
                  {`${fund.name} · ${formatCurrency(fund.balance, fund.currency)}`}
                </option>
              ))}
            </Select>
            {!funds.length ? (
              <p className="mt-1.5 text-[12px] leading-4 text-[var(--ds-status-orange)]">
                Add a cash, bank, or wallet account in {account.currency} first.
                This payment has to use an account you already have.
              </p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-[var(--ds-gray-700)]">
              Amount ({account.currency})
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              max={cap || undefined}
              value={amountText}
              disabled={cap <= 0}
              onChange={(event) => setAmountText(event.target.value)}
            />
            {people && chosen.length ? (
              <p className="mt-1.5 text-[12px] text-[var(--ds-gray-700)]">
                Selected entries add up to{" "}
                {formatCurrency(chosenTotal, account.currency)}. A smaller
                amount settles them from the oldest one first.
              </p>
            ) : null}
          </label>

          {error ? (
            <p className="text-[13px] text-[var(--ds-status-red)]">{error}</p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
