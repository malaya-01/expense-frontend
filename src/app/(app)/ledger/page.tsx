"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Download } from "lucide-react";
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
  buildCombinedLines,
  buildConsolidatedLedger,
  type LedgerPeriod,
} from "@/lib/ledger/ledger";
import { convertAmount } from "@/lib/currency/currency.data";
import { cn } from "@/lib/cn";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  todayISO,
} from "@/lib/format";
import { timeFromPaidAt } from "@/lib/receipts/defaults-from-parse";
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
                {`${a.name} · ${GROUP_LABELS[group] || group}`}
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
          period={period}
          onOpen={setSelected}
        />
      ) : consolidated ? (
        <ConsolidatedView
          ledger={consolidated}
          accounts={accounts}
          period={period}
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

/* ---------------------------- Ledger tables ---------------------------- */

/** Ledger cells show plain numbers; the currency is stated once per table. */
function amt(n: number) {
  return Math.abs(n) < 0.005
    ? ""
    : formatNumber(Math.abs(n), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function bal(n: number) {
  const text = formatNumber(Math.abs(n), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < -0.005 ? `(${text})` : text;
}

function shortDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

const TH =
  "px-2 py-2 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[var(--ds-gray-700)] sm:px-3 sm:text-[11px]";
const TD = "px-2 py-2 align-top sm:px-3";
const NUM = "text-right tabular-nums whitespace-nowrap";
const ROW_LINE =
  "border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)]";

function LedgerTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[12px] bg-[var(--ds-background-elevated)] ds-border">
      <table className="w-full min-w-[20rem] border-collapse text-[12px] text-[var(--ds-gray-1000)] sm:text-[13px]">
        {children}
      </table>
    </div>
  );
}

function StatementTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-end justify-between gap-3 px-1">
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-semibold text-[var(--ds-gray-1000)]">
          {title}
        </h2>
        <p className="text-[11.5px] text-[var(--ds-gray-700)]">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

function periodText(period: LedgerPeriod) {
  if (!period.from && !period.to) return "All time";
  return `${period.from ? formatDate(period.from) : "Start"} – ${
    period.to ? formatDate(period.to) : "Today"
  }`;
}

function Particulars({
  tx,
  detail,
}: {
  tx: LedgerTransaction;
  detail: string;
}) {
  const time = timeFromPaidAt(tx.paid_at);
  return (
    <>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="break-words font-medium">{tx.description}</span>
        <SyncBadge row={tx as never} />
      </span>
      <span className="block text-[11px] leading-4 text-[var(--ds-gray-700)]">
        {[detail, time].filter(Boolean).join(" · ")}
      </span>
    </>
  );
}

function AccountLedgerView({
  ledger,
  period,
  onOpen,
}: {
  ledger: ReturnType<typeof buildAccountLedger>;
  period: LedgerPeriod;
  onOpen: (tx: LedgerTransaction) => void;
}) {
  const { account } = ledger;
  const words = balanceWording(account);

  return (
    <>
      <StatementTitle
        title={`${account.name} — ledger`}
        subtitle={`${getContainerMeta(account.type).label} · ${periodText(period)} · amounts in ${account.currency}`}
        right={
          <p className="shrink-0 text-right">
            <span className="block text-[11px] text-[var(--ds-gray-700)]">
              {words.balance} now
            </span>
            <span className="text-[15px] font-semibold tabular-nums">
              {formatCurrency(Number(account.balance), account.currency)}
            </span>
          </p>
        }
      />
      <LedgerTable>
        <thead className="bg-[var(--ds-gray-100)]">
          <tr>
            <th className={cn(TH, "w-[3.6rem] text-left")}>Date</th>
            <th className={cn(TH, "text-left")}>Particulars</th>
            <th className={cn(TH, "text-right")}>{words.upCol}</th>
            <th className={cn(TH, "text-right")}>{words.downCol}</th>
            <th className={cn(TH, "text-right")}>{words.balance}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-[color-mix(in_srgb,var(--ds-gray-100)_50%,transparent)]">
            <td className={cn(TD, "text-[var(--ds-gray-700)]")}>
              {period.from ? shortDate(period.from) : ""}
            </td>
            <td className={cn(TD, "font-semibold")} colSpan={3}>
              Opening balance
            </td>
            <td className={cn(TD, NUM, "font-semibold")}>{bal(ledger.opening)}</td>
          </tr>
          {ledger.entries.length === 0 ? (
            <tr className={ROW_LINE}>
              <td className={cn(TD, "py-6 text-center text-[var(--ds-gray-700)]")} colSpan={5}>
                No entries in this period.
              </td>
            </tr>
          ) : (
            ledger.entries.map((e) => (
              <tr
                key={e.tx.id}
                className={cn(ROW_LINE, "cursor-pointer hover:bg-[var(--ds-gray-100)]")}
                onClick={() => onOpen(e.tx)}
              >
                <td className={cn(TD, "whitespace-nowrap text-[var(--ds-gray-900)]")}>
                  {shortDate(e.tx.date)}
                </td>
                <td className={cn(TD, "min-w-[7rem]")}>
                  <Particulars tx={e.tx} detail={e.counterparty} />
                </td>
                <td className={cn(TD, NUM)}>{e.change > 0 ? amt(e.change) : ""}</td>
                <td className={cn(TD, NUM)}>{e.change < 0 ? amt(e.change) : ""}</td>
                <td className={cn(TD, NUM, "text-[var(--ds-gray-900)]")}>
                  {bal(e.balanceAfter)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-[3px] border-double border-[color:color-mix(in_srgb,var(--ds-gray-1000)_25%,transparent)]">
            <td className={TD} />
            <td className={cn(TD, "font-semibold")}>Totals</td>
            <td className={cn(TD, NUM, "font-semibold")}>{amt(ledger.increases)}</td>
            <td className={cn(TD, NUM, "font-semibold")}>{amt(ledger.decreases)}</td>
            <td className={TD} />
          </tr>
          <tr className={cn(ROW_LINE, "bg-[color-mix(in_srgb,var(--ds-gray-100)_50%,transparent)]")}>
            <td className={cn(TD, "text-[var(--ds-gray-700)]")}>
              {period.to ? shortDate(period.to) : ""}
            </td>
            <td className={cn(TD, "font-semibold")} colSpan={3}>
              Closing balance
            </td>
            <td className={cn(TD, NUM, "font-semibold")}>{bal(ledger.closing)}</td>
          </tr>
        </tfoot>
      </LedgerTable>
      <p className="mt-2 px-1 text-[11px] text-[var(--ds-gray-700)]">
        Opening + {words.upCol.toLowerCase()} − {words.downCol.toLowerCase()} =
        closing. Tap a row to see or edit the entry.
      </p>
    </>
  );
}

function ConsolidatedView({
  ledger,
  accounts,
  period,
  baseCurrency,
  onOpen,
  onAccount,
}: {
  ledger: ReturnType<typeof buildConsolidatedLedger>;
  accounts: FinancialContainer[];
  period: LedgerPeriod;
  baseCurrency: string;
  onOpen: (tx: LedgerTransaction) => void;
  onAccount: (id: string) => void;
}) {
  const lines = buildCombinedLines(accounts, ledger);
  const active = ledger.accounts.filter(
    (a) => a.entries.length > 0 || Math.abs(Number(a.account.balance)) > 0.005,
  );
  const signed = (a: (typeof active)[number], n: number) =>
    convertAmount(
      isLiabilityType(a.account.type) ? -n : n,
      a.account.currency,
      baseCurrency,
    );
  const totalOpening = active.reduce((s, a) => s + signed(a, a.opening), 0);
  const totalClosing = active.reduce((s, a) => s + signed(a, a.closing), 0);

  return (
    <div className="space-y-5">
      <section>
        <StatementTitle
          title="Account balances"
          subtitle={`${periodText(period)} · tap an account for its own ledger`}
        />
        <LedgerTable>
          <thead className="bg-[var(--ds-gray-100)]">
            <tr>
              <th className={cn(TH, "text-left")}>Account</th>
              <th className={cn(TH, "text-right")}>Opening</th>
              <th className={cn(TH, "hidden text-right sm:table-cell")}>Increase</th>
              <th className={cn(TH, "hidden text-right sm:table-cell")}>Decrease</th>
              <th className={cn(TH, "text-right")}>Closing</th>
            </tr>
          </thead>
          <tbody>
            {active.map((a) => {
              const liability = isLiabilityType(a.account.type);
              return (
                <tr
                  key={a.account.id}
                  className={cn(ROW_LINE, "cursor-pointer hover:bg-[var(--ds-gray-100)]")}
                  onClick={() => onAccount(a.account.id)}
                >
                  <td className={TD}>
                    <span className="block font-medium">{a.account.name}</span>
                    <span className="block text-[11px] text-[var(--ds-gray-700)]">
                      {balanceWording(a.account).balance} · {a.account.currency}
                    </span>
                  </td>
                  <td className={cn(TD, NUM, liability && "text-[var(--ds-status-red)]")}>
                    {liability ? "−" : ""}
                    {bal(a.opening)}
                  </td>
                  <td className={cn(TD, NUM, "hidden sm:table-cell")}>{amt(a.increases)}</td>
                  <td className={cn(TD, NUM, "hidden sm:table-cell")}>{amt(a.decreases)}</td>
                  <td className={cn(TD, NUM, "font-semibold", liability && "text-[var(--ds-status-red)]")}>
                    {liability ? "−" : ""}
                    {bal(a.closing)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-[3px] border-double border-[color:color-mix(in_srgb,var(--ds-gray-1000)_25%,transparent)]">
              <td className={cn(TD, "font-semibold")}>
                Net worth
                <span className="block text-[11px] font-normal text-[var(--ds-gray-700)]">
                  what you own − what you owe · {baseCurrency}
                </span>
              </td>
              <td className={cn(TD, NUM, "font-semibold")}>{bal(totalOpening)}</td>
              <td className={cn(TD, "hidden sm:table-cell")} />
              <td className={cn(TD, "hidden sm:table-cell")} />
              <td className={cn(TD, NUM, "font-semibold")}>{bal(totalClosing)}</td>
            </tr>
          </tfoot>
        </LedgerTable>
      </section>

      <section>
        <StatementTitle
          title="Consolidated ledger"
          subtitle={`Every entry, one line per account it touches · ${periodText(period)}`}
        />
        <LedgerTable>
          <thead className="bg-[var(--ds-gray-100)]">
            <tr>
              <th className={cn(TH, "w-[3.6rem] text-left")}>Date</th>
              <th className={cn(TH, "text-left")}>Particulars</th>
              <th className={cn(TH, "text-right")}>In</th>
              <th className={cn(TH, "text-right")}>Out</th>
              <th className={cn(TH, "hidden text-right md:table-cell")}>Net worth</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[color-mix(in_srgb,var(--ds-gray-100)_50%,transparent)]">
              <td className={cn(TD, "text-[var(--ds-gray-700)]")}>
                {period.from ? shortDate(period.from) : ""}
              </td>
              <td className={cn(TD, "font-semibold")} colSpan={3}>
                Opening net worth
                <span className="font-normal text-[var(--ds-gray-700)] md:hidden">
                  {" "}· {bal(ledger.openingWorth)}
                </span>
              </td>
              <td className={cn(TD, NUM, "hidden font-semibold md:table-cell")}>
                {bal(ledger.openingWorth)}
              </td>
            </tr>
            {lines.length === 0 ? (
              <tr className={ROW_LINE}>
                <td className={cn(TD, "py-6 text-center text-[var(--ds-gray-700)]")} colSpan={5}>
                  No entries in this period.
                </td>
              </tr>
            ) : (
              lines.map((line, index) => {
                const first = index === 0 || lines[index - 1].tx.id !== line.tx.id;
                const accountText = line.account
                  ? `${line.account.name}${isLiabilityType(line.account.type) || line.account.type === "receivable" ? ` (${balanceWording(line.account).balance.toLowerCase()})` : ""}`
                  : "—";
                const other =
                  line.tx.type === "expense"
                    ? line.tx.category_name || "Spending"
                    : line.tx.type === "income"
                      ? line.tx.category_name || "Income"
                      : "Transfer";
                return (
                  <tr
                    key={`${line.tx.id}-${index}`}
                    className={cn(
                      first && ROW_LINE,
                      "cursor-pointer hover:bg-[var(--ds-gray-100)]",
                    )}
                    onClick={() => onOpen(line.tx)}
                  >
                    <td className={cn(TD, "whitespace-nowrap text-[var(--ds-gray-900)]", !first && "pt-0")}>
                      {first ? shortDate(line.tx.date) : ""}
                    </td>
                    <td className={cn(TD, "min-w-[7rem]", !first && "pt-0")}>
                      {first ? (
                        <Particulars tx={line.tx} detail={other} />
                      ) : null}
                      <span className="mt-1 block border-l-2 border-[color:color-mix(in_srgb,var(--ds-gray-1000)_18%,transparent)] pl-2 text-[11.5px] leading-4 text-[var(--ds-gray-900)]">
                        {accountText}
                      </span>
                    </td>
                    <td style={{ verticalAlign: "bottom" }} className={cn(TD, NUM, "text-[var(--ds-status-green)]", !first && "pt-0")}>
                      {amt(line.moneyIn)}
                    </td>
                    <td style={{ verticalAlign: "bottom" }} className={cn(TD, NUM, "text-[var(--ds-status-red)]", !first && "pt-0")}>
                      {amt(line.moneyOut)}
                    </td>
                    <td style={{ verticalAlign: "bottom" }} className={cn(TD, NUM, "hidden text-[var(--ds-gray-900)] md:table-cell", !first && "pt-0")}>
                      {line.worthAfter != null && line.tx.type !== "transfer"
                        ? bal(line.worthAfter)
                        : ""}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-[3px] border-double border-[color:color-mix(in_srgb,var(--ds-gray-1000)_25%,transparent)]">
              <td className={TD} />
              <td className={cn(TD, "font-semibold")}>
                Income {amt(ledger.moneyIn) || "0.00"} · Spending{" "}
                {amt(ledger.moneyOut) || "0.00"}
                <span className="block text-[11px] font-normal text-[var(--ds-gray-700)]">
                  {amt(ledger.moved) || "0.00"} moved between your own accounts
                  (no effect on net worth)
                </span>
              </td>
              <td className={TD} colSpan={2} />
              <td className={cn(TD, "hidden md:table-cell")} />
            </tr>
            <tr className={cn(ROW_LINE, "bg-[color-mix(in_srgb,var(--ds-gray-100)_50%,transparent)]")}>
              <td className={cn(TD, "text-[var(--ds-gray-700)]")}>
                {period.to ? shortDate(period.to) : ""}
              </td>
              <td className={cn(TD, "font-semibold")} colSpan={3}>
                Closing net worth
                <span className="font-normal text-[var(--ds-gray-700)] md:hidden">
                  {" "}· {bal(ledger.closingWorth)}
                </span>
              </td>
              <td className={cn(TD, NUM, "hidden font-semibold md:table-cell")}>
                {bal(ledger.closingWorth)}
              </td>
            </tr>
          </tfoot>
        </LedgerTable>
        <p className="mt-2 px-1 text-[11px] text-[var(--ds-gray-700)]">
          In/Out are per account, in that account&apos;s currency. A payment
          into a payable or card shows as “In” there because it reduces what
          you owe. Brackets mean a negative balance.
        </p>
      </section>
    </div>
  );
}
