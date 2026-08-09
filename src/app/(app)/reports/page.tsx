"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/ui/page-header";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { StatusDot } from "@/components/ui/status-dot";
import { getReportOverview } from "@/lib/api/reports";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/format";
import { getErrorMessage } from "@/lib/api/client";
import { assetTypeLabel } from "@/lib/investments/meta";
import type { ReportOverview } from "@/types";
import { Alert, CardGridSkeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useTransactionModal } from "@/components/expenses/transaction-modal-provider";
import { canCrud } from "@/lib/permissions";

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { openTransactionModal } = useTransactionModal();
  const canCreateTx = canCrud(user, "expenses", "create");
  const [months, setMonths] = useState(6);
  const [report, setReport] = useState<ReportOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getReportOverview(months);
      setReport(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load reports"));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    if (!user?.id) return;
    refresh();
  }, [user?.id, refresh]);

  const currency = report?.base_currency || user?.currency || "USD";

  const cashFlowMax = useMemo(() => {
    if (!report?.cash_flow.length) return 1;
    return Math.max(
      1,
      ...report.cash_flow.flatMap((m) => [m.income, m.expense]),
    );
  }, [report]);

  function download(content: string, type: string, extension: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `finos-report-${months}-months-${new Date().toISOString().slice(0, 10)}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast({
      title: `${extension.toUpperCase()} report exported`,
      tone: "success",
    });
  }

  function exportJson() {
    if (!report) return;
    download(
      JSON.stringify(report, null, 2),
      "application/json",
      "json",
    );
  }

  function exportCsv() {
    if (!report) return;
    const rows: Array<Array<string | number>> = [
      ["Section", "Period / Name", "Income", "Expense / Amount", "Net / Share"],
      ...report.cash_flow.map((row) => [
        "Cash flow",
        row.month,
        row.income,
        row.expense,
        row.net,
      ]),
      ...report.spending_by_category.map((row) => [
        "Spending category",
        row.category_name,
        "",
        row.amount,
        row.percent,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    download(csv, "text/csv;charset=utf-8", "csv");
  }

  return (
    <div>
      <ModuleHeader
        title="Reports"
        description="What does my financial picture look like? Ledger, budgets, and portfolio in one view."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Report window"
              value={String(months)}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-[140px]"
            >
              <option value="3">Last 3 months</option>
              <option value="6">Last 6 months</option>
              <option value="12">Last 12 months</option>
            </Select>
            <Button
              variant="secondary"
              onClick={refresh}
              loading={loading}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={exportCsv}
              disabled={!report}
            >
              <Download size={14} />
              CSV
            </Button>
            <Button
              variant="secondary"
              onClick={exportJson}
              disabled={!report}
            >
              <Download size={14} />
              JSON
            </Button>
          </div>
        }
      />

      {error ? (
        <Alert
          className="mb-4"
          tone="error"
          title="Report could not be generated"
          description={error}
          actionLabel="Retry"
          onAction={() => void refresh()}
        />
      ) : null}

      {loading && !report ? (
        <CardGridSkeleton />
      ) : !report ? (
        <div className="rounded-[12px] bg-[var(--ds-background-elevated)] ds-border">
          <EmptyState
            title="No report data"
            description="Add accounts and transactions to unlock cash flow and spending reports."
            actionLabel="Go to accounts"
            onAction={() => {
              window.location.href = "/accounts";
            }}
          />
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Net worth"
              value={formatCurrency(report.twin.net_worth, currency)}
              subtitle={`${report.twin.container_count} containers · ${currency}`}
              tone="blue"
            />
            <MetricCard
              title="This month net"
              value={formatCurrency(report.this_month.net, currency)}
              subtitle={`${formatCurrency(report.this_month.income, currency)} in · ${formatCurrency(report.this_month.expense, currency)} out`}
              tone={report.this_month.net >= 0 ? "green" : "orange"}
            />
            <MetricCard
              title="Savings rate"
              value={`${report.this_month.savings_rate.toFixed(0)}%`}
              subtitle="Income retained this month"
              tone={report.this_month.savings_rate >= 20 ? "green" : "orange"}
            />
            <MetricCard
              title="Portfolio"
              value={formatCurrency(report.investments.total_value, currency)}
              subtitle={
                report.investments.holding_count > 0
                  ? `${report.investments.gain_percent >= 0 ? "+" : ""}${report.investments.gain_percent.toFixed(1)}% P/L`
                  : "No holdings yet"
              }
              tone="purple"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <h2>Cash flow</h2>
                <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                  Income vs expenses by month ({currency})
                </p>
              </CardHeader>
              <CardBody>
                {report.cash_flow.every((m) => m.income === 0 && m.expense === 0) ? (
                  <p className="text-sm text-[var(--ds-gray-900)]">
                    No ledger activity in this window.
                    {canCreateTx ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={openTransactionModal}
                          className="text-[var(--ds-focus-color)]"
                        >
                          Record a transaction
                        </button>
                      </>
                    ) : null}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {report.cash_flow.map((m) => (
                      <div key={m.month}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-[var(--ds-gray-1000)]">
                            {monthLabel(m.month)}
                          </span>
                          <span
                            className="tabular-nums"
                            style={{
                              color:
                                m.net >= 0
                                  ? "var(--ds-status-green)"
                                  : "var(--ds-status-orange)",
                            }}
                          >
                            {m.net >= 0 ? "+" : ""}
                            {formatCurrency(m.net, currency)}
                          </span>
                        </div>
                        <div className="flex h-2 gap-1">
                          <div
                            className="rounded-full bg-[var(--ds-status-green)] transition-[width] duration-500"
                            style={{
                              width: `${(m.income / cashFlowMax) * 100}%`,
                              minWidth: m.income > 0 ? 4 : 0,
                            }}
                            title={`Income ${formatCurrency(m.income, currency)}`}
                          />
                          <div
                            className="rounded-full bg-[var(--ds-status-orange)] transition-[width] duration-500"
                            style={{
                              width: `${(m.expense / cashFlowMax) * 100}%`,
                              minWidth: m.expense > 0 ? 4 : 0,
                            }}
                            title={`Expense ${formatCurrency(m.expense, currency)}`}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-4 pt-1 text-[11px] text-[var(--ds-gray-700)]">
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot tone="green" /> Income
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot tone="orange" /> Expense
                      </span>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2>Balance sheet</h2>
                <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                  Twin snapshot
                </p>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                <Row
                  label="Cash"
                  value={formatCurrency(report.twin.cash, currency)}
                />
                <Row
                  label="Investments"
                  value={formatCurrency(report.twin.investments, currency)}
                />
                <Row
                  label="Assets"
                  value={formatCurrency(report.twin.assets, currency)}
                />
                <Row
                  label="Liabilities"
                  value={formatCurrency(report.twin.liabilities, currency)}
                  danger={report.twin.liabilities > 0}
                />
                <div className="border-t border-[var(--ds-gray-200)] pt-3">
                  <Row
                    label="Net worth"
                    value={formatCurrency(report.twin.net_worth, currency)}
                    strong
                  />
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <h2>Spending by category</h2>
                  <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                    This calendar month
                  </p>
                </div>
                <Link
                  href="/expenses"
                  className="text-sm text-[var(--ds-focus-color)]"
                >
                  Transactions
                </Link>
              </CardHeader>
              <CardBody>
                {report.spending_by_category.length === 0 ? (
                  <p className="text-sm text-[var(--ds-gray-900)]">
                    No expenses categorized this month.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {report.spending_by_category.map((c) => (
                      <li key={c.category_id}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="inline-flex items-center gap-2 text-[var(--ds-gray-1000)]">
                            <StatusDot
                              color={c.category_color || undefined}
                              tone="orange"
                            />
                            {c.category_name}
                          </span>
                          <span className="tabular-nums text-[var(--ds-gray-900)]">
                            {formatCurrency(c.amount, currency)} ·{" "}
                            {c.percent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ds-gray-100)]">
                          <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{
                              width: `${Math.min(100, c.percent)}%`,
                              backgroundColor:
                                c.category_color || "var(--ds-status-orange)",
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <h2>Budgets vs actual</h2>
                  <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                    {report.budgets.over_count > 0
                      ? `${report.budgets.over_count} over limit`
                      : "Current period"}
                  </p>
                </div>
                <Link
                  href="/budgets"
                  className="text-sm text-[var(--ds-focus-color)]"
                >
                  Budgets
                </Link>
              </CardHeader>
              <CardBody>
                {report.budgets.items.length === 0 ? (
                  <p className="text-sm text-[var(--ds-gray-900)]">
                    No budgets yet.{" "}
                    <Link href="/budgets" className="text-[var(--ds-focus-color)]">
                      Create one
                    </Link>
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--ds-gray-700)]">Spent</span>
                      <span className="tabular-nums">
                        {formatCurrency(report.budgets.total_spent, currency)} /{" "}
                        {formatCurrency(report.budgets.total_budget, currency)}
                      </span>
                    </div>
                    {report.budgets.items.slice(0, 6).map((b) => (
                      <div key={b.id}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-[var(--ds-gray-1000)]">
                            {b.name}
                          </span>
                          <span className="tabular-nums text-[var(--ds-gray-900)]">
                            {b.percent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ds-gray-100)]">
                          <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{
                              width: `${Math.min(100, b.percent)}%`,
                              backgroundColor:
                                b.status === "over"
                                  ? "var(--ds-status-red)"
                                  : b.status === "warning"
                                    ? "var(--ds-status-orange)"
                                    : "var(--ds-status-green)",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <h2>Investment allocation</h2>
                  <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                    By asset type
                  </p>
                </div>
                <Link
                  href="/investments"
                  className="text-sm text-[var(--ds-focus-color)]"
                >
                  Portfolio
                </Link>
              </CardHeader>
              <CardBody>
                {report.investments.allocation.length === 0 ? (
                  <p className="text-sm text-[var(--ds-gray-900)]">
                    No holdings yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {report.investments.allocation.map((a) => (
                      <li key={a.asset_type}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{assetTypeLabel(a.asset_type)}</span>
                          <span className="tabular-nums">
                            {formatCurrency(a.value, currency)} ·{" "}
                            {a.percent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ds-gray-100)]">
                          <div
                            className="h-full rounded-full bg-[var(--ds-status-purple)] transition-[width] duration-500"
                            style={{ width: `${Math.min(100, a.percent)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2>Top merchants</h2>
                <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                  This month
                </p>
              </CardHeader>
              <CardBody>
                {report.top_merchants.length === 0 ? (
                  <p className="text-sm text-[var(--ds-gray-900)]">
                    Add a merchant on expenses to see rankings.
                  </p>
                ) : (
                  <ul>
                    {report.top_merchants.map((m) => (
                      <li
                        key={m.merchant}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-[var(--ds-gray-1000)]">
                            {m.merchant}
                          </p>
                          <p className="text-xs text-[var(--ds-gray-700)]">
                            {m.tx_count} transaction{m.tx_count === 1 ? "" : "s"}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-medium tabular-nums">
                          {formatCurrency(m.amount, currency)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--ds-gray-700)]">{label}</span>
      <span
        className={`tabular-nums ${strong ? "font-semibold text-[var(--ds-gray-1000)]" : "text-[var(--ds-gray-1000)]"}`}
        style={danger ? { color: "var(--ds-status-red)" } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
