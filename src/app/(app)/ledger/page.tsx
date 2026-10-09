"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleHeader } from "@/components/ui/module-header";
import { Select } from "@/components/ui/select";
import { CardGridSkeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { SyncBadge } from "@/components/sync/sync-badge";
import { TransactionDetailModal } from "@/components/expenses/transaction-detail-modal";
import {
  TRANSACTION_CREATED_EVENT,
  useTransactionModal,
} from "@/components/expenses/transaction-modal-provider";
import { saveTextFile } from "@/components/native/save-file";
import { useAuth } from "@/lib/auth-context";
import { listAccounts } from "@/lib/api/accounts";
import { listTransactions } from "@/lib/api/transactions";
import { summarizeTwin } from "@/lib/accounts/metrics";
import {
  getContainerMeta,
  GROUP_LABELS,
  isLiabilityType,
} from "@/lib/accounts/types-meta";
import {
  balanceWording,
  buildAccountLedger,
  buildConsolidatedLedger,
  type LedgerPeriod,
} from "@/lib/ledger/ledger";
import { cn } from "@/lib/cn";
import { formatCurrency, todayISO } from "@/lib/format";
import { timeFromPaidAt } from "@/lib/receipts/defaults-from-parse";
import { transactionAmountClass } from "@/lib/transactions/display";
import type { FinancialContainer, LedgerTransaction } from "@/types";

type PeriodId = "this-month" | "last-month" | "3-months" | "this-year" | "all";

const PERIODS: Array<{ id: PeriodId; label: string }> = [
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "3-months", label: "3 months" },
  { id: "this-year", label: "This year" },
  { id: "all", label: "All time" },
];

const ALL = "all";

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function periodRange(id: PeriodId): LedgerPeriod {
  const today = new Date(`${todayISO()}T00:00:00`);
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (id) {
    case "this-month":
      return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case "last-month":
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case "3-months":
      return { from: iso(new Date(y, m - 2, 1)), to: iso(new Date(y, m + 1, 0)) };
    case "this-year":
      return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) };
    default:
      return { from: null, to: null };
  }
}

function dayHeading(date: string) {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function groupByDay<T extends { tx: LedgerTransaction }>(entries: T[]) {
  // Newest day first; entries within a day newest first.
  const groups = new Map<string, T[]>();
  for (const entry of [...entries].reverse()) {
    const rows = groups.get(entry.tx.date) ?? [];
    rows.push(entry);
    groups.set(entry.tx.date, rows);
  }
  return [...groups.entries()];
}

function flowText(tx: LedgerTransaction) {
  if (tx.type === "transfer") {
    return `${tx.source_name || "—"} → ${tx.destination_name || "—"}`;
  }
  const account =
    tx.type === "expense" ? tx.source_name : tx.destination_name;
  return [account, tx.category_name].filter(Boolean).join(" · ");
}

function csvCell(value: unknown) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function LedgerPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { openEditTransactionModal } = useTransactionModal();
  const baseCurrency = user?.currency || "USD";
  const [accounts, setAccounts] = useState<FinancialContainer[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState<string>(ALL);
  const [periodId, setPeriodId] = useState<PeriodId>("this-month");
  const [selected, setSelected] = useState<LedgerTransaction | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [accountRows, txRows] = await Promise.all([
        listAccounts(user.id),
        listTransactions(),
      ]);
      setAccounts(accountRows);
      setTransactions(txRows);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    // /ledger?account=<id> (from an account card) opens that account.
    const requested = new URLSearchParams(window.location.search).get("account");
    if (requested) setAccountId(requested);
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener("finos:data-updated", onChange);
    window.addEventListener("finos:sync-complete", onChange);
    window.addEventListener(TRANSACTION_CREATED_EVENT, onChange);
    return () => {
      window.removeEventListener("finos:data-updated", onChange);
      window.removeEventListener("finos:sync-complete", onChange);
      window.removeEventListener(TRANSACTION_CREATED_EVENT, onChange);
    };
  }, [refresh]);

  const chooseAccount = (id: string) => {
    setAccountId(id);
    const url = id === ALL ? "/ledger" : `/ledger?account=${encodeURIComponent(id)}`;
    window.history.replaceState(window.history.state, "", url);
    document.querySelector("main")?.scrollTo({ top: 0 });
  };

  const period = useMemo(() => periodRange(periodId), [periodId]);
  const account = accounts.find((a) => a.id === accountId) || null;
  const netWorthNow = useMemo(
    () => summarizeTwin(accounts, baseCurrency).netWorth,
    [accounts, baseCurrency],
  );
  const consolidated = useMemo(
    () =>
      account
        ? null
        : buildConsolidatedLedger(accounts, transactions, period, netWorthNow),
    [account, accounts, transactions, period, netWorthNow],
  );
  const accountLedger = useMemo(
    () => (account ? buildAccountLedger(account, transactions, period) : null),
    [account, transactions, period],
  );

  const accountOptions = useMemo(() => {
    const groups = new Map<string, FinancialContainer[]>();
    for (const a of accounts) {
      const key = getContainerMeta(a.type).group;
      groups.set(key, [...(groups.get(key) ?? []), a]);
    }
    return [...groups.entries()];
  }, [accounts]);

  async function exportCsv() {
    const rows: string[][] = [];
    if (accountLedger) {
      const words = balanceWording(accountLedger.account);
      rows.push(["Date", "Time", "Description", "Other side", words.up, words.down, words.balance]);
      for (const e of accountLedger.entries) {
        rows.push([
          e.tx.date,
          timeFromPaidAt(e.tx.paid_at),
          e.tx.description,
          e.counterparty,
          e.change > 0 ? e.change.toFixed(2) : "",
          e.change < 0 ? (-e.change).toFixed(2) : "",
          e.balanceAfter.toFixed(2),
        ]);
      }
    } else if (consolidated) {
      rows.push(["Date", "Time", "Description", "Type", "From/To", "Amount", "Currency", `Net worth (${baseCurrency})`]);
      for (const e of consolidated.entries) {
        rows.push([
          e.tx.date,
          timeFromPaidAt(e.tx.paid_at),
          e.tx.description,
          e.tx.type,
          flowText(e.tx),
          Number(e.tx.amount).toFixed(2),
          e.tx.currency || baseCurrency,
          e.worthAfter.toFixed(2),
        ]);
      }
    }
    const name = `opal-ledger-${account ? account.name : "all-accounts"}-${periodId}.csv`;
    try {
      const saved = await saveTextFile(
        name,
        rows.map((r) => r.map(csvCell).join(",")).join("\n"),
        "text/csv",
      );
      showToast({
        title: "Ledger exported",
        description: saved.kind === "native" ? `Saved to ${saved.path}` : saved.name,
        tone: "success",
      });
    } catch {
      showToast({ title: "Could not save the file", tone: "error" });
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Ledger"
        description="Every entry with its running balance — for one account or all of them together."
        inlineActions
        actions={
          <Button variant="secondary" onClick={() => void exportCsv()} disabled={loading}>
            <Download size={14} />
            CSV
          </Button>
        }
      />

      <div className="mb-3 space-y-2.5 sm:mb-5">
        <Select
          aria-label="Account"
          value={accountId}
          onChange={(e) => chooseAccount(e.target.value)}
          className="h-10"
        >
          <option value={ALL}>All accounts (consolidated)</option>
          {accountOptions.flatMap(([group, rows]) =>
            rows.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {GROUP_LABELS[group] || group}
              </option>
            )),
          )}
        </Select>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodId(p.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ds-focus",
                periodId === p.id
                  ? "bg-[var(--ds-gray-1000)] text-[var(--ds-primary-foreground)]"
                  : "bg-[var(--ds-background-elevated)] text-[var(--ds-gray-900)] ds-border",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <CardGridSkeleton />
      ) : accountLedger ? (
        <AccountLedgerView
          ledger={accountLedger}
          onOpen={setSelected}
        />
      ) : consolidated ? (
        <ConsolidatedView
          ledger={consolidated}
          baseCurrency={baseCurrency}
          onOpen={setSelected}
          onAccount={chooseAccount}
        />
      ) : null}

      <TransactionDetailModal
        transaction={selected}
        baseCurrency={baseCurrency}
        onClose={() => setSelected(null)}
        onEdit={(tx) => {
          setSelected(null);
          openEditTransactionModal(tx);
        }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "in" | "out" | "neutral";
}) {
  return (
    <div className="min-w-0 rounded-[12px] bg-[var(--ds-background-100)] px-3 py-2.5">
      <p className="truncate text-[11px] text-[var(--ds-gray-700)]">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-[15px] font-semibold tabular-nums",
          tone === "in"
            ? "text-[var(--ds-status-green)]"
            : tone === "out"
              ? "text-[var(--ds-status-red)]"
              : "text-[var(--ds-gray-1000)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyEntries() {
  return (
    <p className="rounded-[14px] bg-[var(--ds-background-elevated)] px-4 py-8 text-center text-[13px] text-[var(--ds-gray-700)] ds-border">
      No entries in this period.
    </p>
  );
}

function AccountLedgerView({
  ledger,
  onOpen,
}: {
  ledger: ReturnType<typeof buildAccountLedger>;
  onOpen: (tx: LedgerTransaction) => void;
}) {
  const { account } = ledger;
  const words = balanceWording(account);
  const liability = isLiabilityType(account.type);
  const money = (n: number) => formatCurrency(n, account.currency);
  // For owed-money accounts an increase is bad news (red), a decrease good.
  const upTone = liability ? "out" : "in";
  const downTone = liability ? "in" : "out";

  return (
    <>
      <section className="mb-3 rounded-[14px] bg-[var(--ds-background-elevated)] p-3 ds-border sm:mb-5 sm:p-4">
        <div className="mb-2.5 flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-[var(--ds-gray-1000)]">
              {account.name}
            </h2>
            <p className="text-[12px] text-[var(--ds-gray-700)]">
              {getContainerMeta(account.type).label} · {account.currency}
            </p>
          </div>
          <p className="shrink-0 text-right">
            <span className="block text-[11px] text-[var(--ds-gray-700)]">
              {words.balance} now
            </span>
            <span className="text-[16px] font-semibold tabular-nums">
              {money(Number(account.balance))}
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label={`${words.balance} at start`} value={money(ledger.opening)} />
          <Stat label={words.up} value={`+${money(ledger.increases)}`} tone={upTone} />
          <Stat label={words.down} value={`−${money(ledger.decreases)}`} tone={downTone} />
          <Stat label={`${words.balance} at end`} value={money(ledger.closing)} />
        </div>
      </section>

      {ledger.entries.length === 0 ? (
        <EmptyEntries />
      ) : (
        <div className="space-y-3">
          {groupByDay(ledger.entries).map(([date, entries]) => (
            <section key={date}>
              <h3 className="mb-1.5 px-1 text-[12px] font-semibold text-[var(--ds-gray-900)]">
                {dayHeading(date)}
              </h3>
              <ul className="overflow-hidden rounded-[14px] bg-[var(--ds-background-elevated)] ds-border">
                {entries.map((e) => {
                  const time = timeFromPaidAt(e.tx.paid_at);
                  const tone = e.change >= 0 ? upTone : downTone;
                  return (
                    <li
                      key={e.tx.id}
                      className="border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_7%,transparent)] last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() => onOpen(e.tx)}
                        className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--ds-gray-100)] ds-focus"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-[13.5px] font-medium text-[var(--ds-gray-1000)]">
                              {e.tx.description}
                            </span>
                            <SyncBadge row={e.tx as never} />
                          </p>
                          <p className="mt-0.5 truncate text-[11.5px] text-[var(--ds-gray-700)]">
                            {[time, e.counterparty].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={cn(
                              "text-[13.5px] font-semibold tabular-nums",
                              tone === "in"
                                ? "text-[var(--ds-status-green)]"
                                : "text-[var(--ds-status-red)]",
                            )}
                          >
                            {e.change >= 0 ? "+" : "−"}
                            {money(Math.abs(e.change))}
                          </p>
                          <p className="text-[11px] tabular-nums text-[var(--ds-gray-700)]">
                            {money(e.balanceAfter)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function ConsolidatedView({
  ledger,
  baseCurrency,
  onOpen,
  onAccount,
}: {
  ledger: ReturnType<typeof buildConsolidatedLedger>;
  baseCurrency: string;
  onOpen: (tx: LedgerTransaction) => void;
  onAccount: (id: string) => void;
}) {
  const money = (n: number) => formatCurrency(n, baseCurrency);
  const active = ledger.accounts.filter(
    (a) =>
      a.entries.length > 0 || Math.abs(Number(a.account.balance)) > 0.005,
  );

  return (
    <>
      <section className="mb-3 rounded-[14px] bg-[var(--ds-background-elevated)] p-3 ds-border sm:mb-5 sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Net worth at start" value={money(ledger.openingWorth)} />
          <Stat label="Money in (income)" value={`+${money(ledger.moneyIn)}`} tone="in" />
          <Stat label="Money out (spending)" value={`−${money(ledger.moneyOut)}`} tone="out" />
          <Stat label="Net worth at end" value={money(ledger.closingWorth)} />
        </div>
        {ledger.moved > 0 ? (
          <p className="mt-2 text-[11.5px] text-[var(--ds-gray-700)]">
            {money(ledger.moved)} moved between your own accounts (transfers,
            debt payments) — that doesn’t change your net worth.
          </p>
        ) : null}
      </section>

      {active.length ? (
        <section className="mb-3 sm:mb-5">
          <h3 className="mb-1.5 px-1 text-[12px] font-semibold text-[var(--ds-gray-900)]">
            Accounts
          </h3>
          <ul className="overflow-hidden rounded-[14px] bg-[var(--ds-background-elevated)] ds-border">
            {active.map(({ account, opening, closing }) => {
              const words = balanceWording(account);
              return (
                <li
                  key={account.id}
                  className="border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_7%,transparent)] last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => onAccount(account.id)}
                    className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--ds-gray-100)] ds-focus"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-[var(--ds-gray-1000)]">
                        {account.name}
                      </p>
                      <p className="truncate text-[11.5px] text-[var(--ds-gray-700)]">
                        {words.balance}
                      </p>
                    </div>
                    <p className="flex shrink-0 items-center gap-1 text-[12.5px] tabular-nums">
                      <span className="text-[var(--ds-gray-700)]">
                        {formatCurrency(opening, account.currency)}
                      </span>
                      <ArrowRight size={12} className="text-[var(--ds-gray-700)]" aria-hidden />
                      <span className="font-semibold text-[var(--ds-gray-1000)]">
                        {formatCurrency(closing, account.currency)}
                      </span>
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {ledger.entries.length === 0 ? (
        <EmptyEntries />
      ) : (
        <div className="space-y-3">
          {groupByDay(ledger.entries).map(([date, entries]) => {
            const dayNet = entries.reduce((s, e) => s + e.worthChange, 0);
            return (
              <section key={date}>
                <div className="mb-1.5 flex items-baseline justify-between px-1">
                  <h3 className="text-[12px] font-semibold text-[var(--ds-gray-900)]">
                    {dayHeading(date)}
                  </h3>
                  {Math.abs(dayNet) > 0.005 ? (
                    <span
                      className={cn(
                        "text-[11.5px] font-medium tabular-nums",
                        dayNet > 0
                          ? "text-[var(--ds-status-green)]"
                          : "text-[var(--ds-status-red)]",
                      )}
                    >
                      {dayNet > 0 ? "+" : "−"}
                      {money(Math.abs(dayNet))} for the day
                    </span>
                  ) : null}
                </div>
                <ul className="overflow-hidden rounded-[14px] bg-[var(--ds-background-elevated)] ds-border">
                  {entries.map((e) => {
                    const time = timeFromPaidAt(e.tx.paid_at);
                    const sign =
                      e.tx.type === "income" ? "+" : e.tx.type === "expense" ? "−" : "";
                    return (
                      <li
                        key={e.tx.id}
                        className="border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_7%,transparent)] last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() => onOpen(e.tx)}
                          className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--ds-gray-100)] ds-focus"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate text-[13.5px] font-medium text-[var(--ds-gray-1000)]">
                                {e.tx.description}
                              </span>
                              <SyncBadge row={e.tx as never} />
                            </p>
                            <p className="mt-0.5 truncate text-[11.5px] text-[var(--ds-gray-700)]">
                              {[time, flowText(e.tx)].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className={cn(
                                "text-[13.5px] font-semibold tabular-nums",
                                transactionAmountClass(e.tx.type),
                              )}
                            >
                              {sign}
                              {formatCurrency(Number(e.tx.amount), e.tx.currency || baseCurrency)}
                            </p>
                            <p className="text-[11px] text-[var(--ds-gray-700)]">
                              {e.tx.type === "transfer" ? "Transfer" : `Worth ${money(e.worthAfter)}`}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
