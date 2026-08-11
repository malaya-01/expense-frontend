"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ModuleHeader } from "@/components/ui/module-header";
import { EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { useTransactionModal } from "@/components/expenses/transaction-modal-provider";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import {
  Alert,
  Badge,
  PageSkeleton,
  Progress,
} from "@/components/ui/feedback";
import { listAccounts } from "@/lib/api/accounts";
import { listBudgets } from "@/lib/api/budgets";
import { listGoals } from "@/lib/api/goals";
import { listInvestments } from "@/lib/api/investments";
import { listTransactions } from "@/lib/api/transactions";
import { summarizeTwin } from "@/lib/accounts/metrics";
import { getContainerMeta, isLiabilityType } from "@/lib/accounts/types-meta";
import { useAuth } from "@/lib/auth-context";
import { APP_NAME } from "@/lib/brand";
import { canCrud } from "@/lib/permissions";
import {
  formatCurrency,
  formatRelativeDate,
  monthKey,
} from "@/lib/format";
import type {
  Budget,
  FinancialContainer,
  Goal,
  InvestmentSummary,
  LedgerTransaction,
} from "@/types";

export default function DashboardPage() {
  const { openTransactionModal } = useTransactionModal();
  const router = useRouter();
  const { user, ready } = useAuth();
  const canCreateTx = canCrud(user, "expenses", "create");
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [containers, setContainers] = useState<FinancialContainer[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [investSummary, setInvestSummary] = useState<InvestmentSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!ready || !user?.id) return;
    let alive = true;
    const load = async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      try {
        const { bootstrapOfflineSync } = await import("@/lib/offline/sync-engine");
        await bootstrapOfflineSync(user.id);
      } catch {
        /* still attempt REST-backed lists */
      }
      if (!alive) return;
      const results = await Promise.allSettled([
        listTransactions(),
        listAccounts(user.id),
        listBudgets(),
        listGoals(),
        listInvestments(),
      ]);
      if (!alive) return;
      const [tx, account, budget, goal, investment] = results;
      if (tx.status === "fulfilled") setTransactions(tx.value);
      if (account.status === "fulfilled") setContainers(account.value);
      if (budget.status === "fulfilled") setBudgets(budget.value);
      if (goal.status === "fulfilled") setGoals(goal.value);
      if (investment.status === "fulfilled") {
        setInvestSummary(investment.value.summary);
      }
      setLoadError(results.some((result) => result.status === "rejected"));
      setLoading(false);
    };
    void load(true);
    const onSync = () => void load(false);
    window.addEventListener("finos:sync-complete", onSync);
    return () => {
      alive = false;
      window.removeEventListener("finos:sync-complete", onSync);
    };
  }, [ready, user?.id]);

  const twin = useMemo(
    () => summarizeTwin(containers, user?.currency || "USD"),
    [containers, user?.currency],
  );
  const baseCurrency = twin.baseCurrency;

  const stats = useMemo(() => {
    const thisMonth = monthKey();
    const monthTx = transactions.filter((e) => e.date.startsWith(thisMonth));
    const outflow = monthTx
      .filter((t) => t.type === "expense")
      .reduce((sum, e) => sum + Number(e.amount_base ?? e.amount), 0);
    const inflow = monthTx
      .filter((t) => t.type === "income")
      .reduce((sum, e) => sum + Number(e.amount_base ?? e.amount), 0);
    const healthScore = Math.round(
      Math.max(
        15,
        Math.min(
          98,
          55 +
            (twin.netWorth > 0 ? 15 : 0) +
            (twin.totalCash > 0 ? 10 : 0) +
            (twin.totalLiabilities === 0 ? 10 : -Math.min(20, twin.totalLiabilities / 1000)) +
            Math.min(10, twin.containerCount * 2) -
            Math.min(15, outflow / 500) +
            Math.min(10, inflow / 1000),
        ),
      ),
    );

    return {
      outflow,
      inflow,
      count: monthTx.length,
      healthScore,
      recent: [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
      topContainers: [...containers]
        .filter((c) => c.include_in_net_worth)
        .sort((a, b) => Number(b.balance) - Number(a.balance))
        .slice(0, 5),
    };
  }, [transactions, containers, twin]);

  const firstName = user?.full_name?.split(" ")[0];
  const healthGrade =
    stats.healthScore >= 90
      ? "A"
      : stats.healthScore >= 80
        ? "B"
        : stats.healthScore >= 70
          ? "C"
          : stats.healthScore >= 60
            ? "D"
            : "F";
  const healthLabel =
    stats.healthScore >= 80
      ? "Strong"
      : stats.healthScore >= 70
        ? "Stable"
        : stats.healthScore >= 60
          ? "Needs attention"
          : "Critical";

  if (loading) return <PageSkeleton />;

  return (
    <div className="min-w-0">
      <ModuleHeader
        title={firstName ? `${firstName}'s ${APP_NAME}` : "Overview"}
        description="Where is your money, where did it go, and what should you do next?"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => router.push("/accounts")}>
              Accounts
            </Button>
            <Button variant="secondary" onClick={() => router.push("/reports")}>
              Reports
            </Button>
            {canCreateTx ? (
              <Button onClick={openTransactionModal}>New transaction</Button>
            ) : null}
          </div>
        }
      />

      {loadError ? (
        <Alert
          className="mb-5"
          tone="warning"
          title="Some dashboard data could not be loaded"
          description="Available information is still shown. Refresh the page to retry missing modules."
          actionLabel="Refresh"
          onAction={() => window.location.reload()}
        />
      ) : null}

      <Card className="mb-4 overflow-hidden">
        <CardBody className="py-5">
          <div className="grid gap-3 sm:gap-5 lg:grid-cols-[auto_minmax(0,1fr)_minmax(220px,0.7fr)] lg:items-center">
            <div className="flex items-center gap-4">
              <div className="relative flex size-20 shrink-0 items-center justify-center rounded-full bg-[var(--ds-background-100)] ds-strong-border">
                <span className="text-2xl font-semibold tabular-nums">
                  {stats.healthScore}
                </span>
                <span className="absolute -bottom-1 rounded-full bg-[var(--ds-gray-1000)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ds-primary-foreground)]">
                  {healthGrade}
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base">Financial health</h2>
                  <Badge
                    tone={
                      stats.healthScore >= 80
                        ? "success"
                        : stats.healthScore >= 60
                          ? "warning"
                          : "danger"
                    }
                  >
                    {healthLabel}
                  </Badge>
                </div>
                <p className="mt-1 max-w-md text-xs leading-5 text-[var(--ds-gray-700)]">
                  An explainable estimate based on cash flow, liquidity,
                  liabilities, and the financial data currently tracked.
                </p>
              </div>
            </div>
            <div>
              <Progress
                value={stats.healthScore}
                label="Overall score"
                tone={
                  stats.healthScore >= 80
                    ? "var(--ds-status-green)"
                    : stats.healthScore >= 60
                      ? "var(--ds-status-orange)"
                      : "var(--ds-status-red)"
                }
              />
              <p className="mt-2 text-[11px] text-[var(--ds-gray-700)]">
                {stats.inflow >= stats.outflow
                  ? "Strength: positive monthly cash flow."
                  : "Risk: monthly spending is above recorded income."}
              </p>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() =>
                router.push(
                  `/ai?q=${encodeURIComponent("Explain my financial health score, biggest risk, and fastest improvement.")}`,
                )
              }
            >
              Explain and improve
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-3">
        <MetricCard
          title="Net Worth"
          value={formatCurrency(twin.netWorth, baseCurrency)}
          subtitle={
            twin.containerCount
              ? `${twin.containerCount} containers · ${baseCurrency}`
              : "Add accounts to calculate"
          }
          tone="blue"
        />
        <MetricCard
          title="Total Cash"
          value={formatCurrency(twin.totalCash, baseCurrency)}
          subtitle={`Cash, wallets, banks · ${baseCurrency}`}
          tone="green"
        />
        <MetricCard
          title="Investments"
          value={
            investSummary
              ? formatCurrency(investSummary.total_value, baseCurrency)
              : formatCurrency(twin.investmentValue, baseCurrency)
          }
          subtitle={
            investSummary && investSummary.holding_count > 0
              ? `${investSummary.gain_percent >= 0 ? "+" : ""}${investSummary.gain_percent.toFixed(1)}% P/L · ${investSummary.holding_count} holdings`
              : twin.investmentValue > 0
                ? "From investment containers"
                : "Add holdings to track growth"
          }
          tone="purple"
        />
      </div>

      <div className="mt-4 min-w-0 sm:mt-6">
        <CashFlowChart
          transactions={transactions}
          accounts={containers}
          currency={baseCurrency}
        />
      </div>

      <div className="mt-6 grid min-w-0 gap-4 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2>Cash movement</h2>
              <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                Recent ledger activity across containers
              </p>
            </div>
            <Link
              href="/expenses"
              className="text-sm text-[var(--ds-focus-color)]"
            >
              All transactions
            </Link>
          </CardHeader>
          <CardBody>
            {stats.recent.length === 0 ? (
              <EmptyState
                title="No transactions yet"
                description="Record expense, income, or transfers to move money between containers."
                actionLabel={canCreateTx ? "Add transaction" : undefined}
                onAction={canCreateTx ? openTransactionModal : undefined}
                className="py-10"
              />
            ) : (
              <ul>
                {stats.recent.map((tx) => {
                  const tone =
                    tx.type === "income"
                      ? "green"
                      : tx.type === "transfer"
                        ? "blue"
                        : "orange";
                  const sign =
                    tx.type === "income"
                      ? "+"
                      : tx.type === "expense"
                        ? "−"
                        : "";
                  const flow =
                    tx.type === "transfer"
                      ? `${tx.source_name || "—"} → ${tx.destination_name || "—"}`
                      : tx.type === "expense"
                        ? tx.source_name || "Expense"
                        : tx.destination_name || "Income";
                  return (
                    <li
                      key={tx.id}
                      className="flex min-w-0 items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
                        <StatusDot tone={tone} className="shrink-0" />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate text-sm text-[var(--ds-gray-1000)]">
                            {tx.description}
                          </p>
                          <p className="truncate text-xs text-[var(--ds-gray-700)]">
                            {formatRelativeDate(tx.date)} · {flow}
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-medium tabular-nums text-[var(--ds-gray-1000)]">
                        {sign}
                        {formatCurrency(tx.amount, tx.currency || "USD")}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2>Where is my money?</h2>
              <Link
                href="/accounts"
                className="text-sm text-[var(--ds-focus-color)]"
              >
                All
              </Link>
            </CardHeader>
            <CardBody>
              {stats.topContainers.length === 0 ? (
                <EmptyState
                  title="No containers"
                  description="Add wallets, banks, cards, or investments."
                  actionLabel="Add container"
                  onAction={() => router.push("/accounts")}
                  className="py-8"
                />
              ) : (
                <ul>
                  {stats.topContainers.map((c) => (
                    <ContainerRow key={c.id} container={c} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h2>What should I know?</h2>
                <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                  Twin signals — deepen with {APP_NAME} AI
                </p>
              </div>
              <Link
                href="/ai"
                className="text-sm text-[var(--ds-focus-color)]"
              >
                Ask {APP_NAME}
              </Link>
            </CardHeader>
            <CardBody className="space-y-3">
              <AiInsight
                tone="blue"
                href={`/ai?q=${encodeURIComponent("/health Summarize my financial twin in 5 bullets.")}`}
                text={
                  twin.containerCount === 0
                    ? "Create financial containers to unlock real net worth."
                    : `Your twin tracks ${twin.containerCount} container${twin.containerCount === 1 ? "" : "s"} totaling ${formatCurrency(twin.netWorth, baseCurrency)} net worth.`
                }
              />
              <AiInsight
                tone="green"
                href={`/ai?q=${encodeURIComponent("@accounts Where is my liquid cash and is it enough?")}`}
                text={
                  twin.totalCash > 0
                    ? `Liquid cash on hand: ${formatCurrency(twin.totalCash, baseCurrency)}.`
                    : "Add a cash or bank container to track liquidity."
                }
              />
              <AiInsight
                tone="orange"
                href={`/ai?q=${encodeURIComponent("/loans How risky are my liabilities right now?")}`}
                text={
                  twin.totalLiabilities > 0
                    ? `Outstanding liabilities: ${formatCurrency(twin.totalLiabilities, baseCurrency)}.`
                    : "No credit or loan containers yet."
                }
              />
              <AiInsight
                tone={
                  budgets.some((b) => b.status === "over")
                    ? "orange"
                    : "blue"
                }
                href={`/ai?q=${encodeURIComponent("/budget Am I overspending against my budgets this month?")}`}
                text={
                  budgets.length === 0
                    ? "Set a budget to see if spending stays on track this month."
                    : budgets.some((b) => b.status === "over")
                      ? `${budgets.filter((b) => b.status === "over").length} budget${budgets.filter((b) => b.status === "over").length === 1 ? "" : "s"} over limit — review Budgets.`
                      : budgets.some((b) => b.status === "warning")
                        ? `${budgets.filter((b) => b.status === "warning").length} budget${budgets.filter((b) => b.status === "warning").length === 1 ? "" : "s"} near the limit.`
                        : `All ${budgets.length} budget${budgets.length === 1 ? "" : "s"} on track this period.`
                }
              />
              <AiInsight
                tone={
                  goals.some((g) => g.status === "behind" || g.status === "at_risk")
                    ? "orange"
                    : "green"
                }
                href={`/ai?q=${encodeURIComponent("/goal How are my goals progressing?")}`}
                text={
                  goals.length === 0
                    ? "Create a goal (emergency fund, vacation, house) to track where savings should go."
                    : goals.some((g) => g.status === "achieved")
                      ? `${goals.filter((g) => g.status === "achieved").length} goal${goals.filter((g) => g.status === "achieved").length === 1 ? "" : "s"} achieved — keep going.`
                      : goals.some((g) => g.status === "behind" || g.status === "at_risk")
                        ? `${goals.filter((g) => g.status === "behind" || g.status === "at_risk").length} goal${goals.filter((g) => g.status === "behind" || g.status === "at_risk").length === 1 ? "" : "s"} need attention.`
                        : `All ${goals.length} goal${goals.length === 1 ? "" : "s"} on track.`
                }
              />
              <AiInsight
                tone="purple"
                href={`/ai?q=${encodeURIComponent("@investments How is my investment portfolio allocated and performing?")}`}
                text={
                  !investSummary || investSummary.holding_count === 0
                    ? "Add investment holdings to see unrealized gains and allocation."
                    : investSummary.total_gain >= 0
                      ? `Portfolio up ${formatCurrency(investSummary.total_gain, baseCurrency)} (${investSummary.gain_percent.toFixed(1)}%).`
                      : `Portfolio down ${formatCurrency(Math.abs(investSummary.total_gain), baseCurrency)} (${investSummary.gain_percent.toFixed(1)}%).`
                }
              />
              <Button
                variant="secondary"
                className="w-full"
                onClick={() =>
                  router.push(
                    `/ai?q=${encodeURIComponent("/scenario What should I do next financially?")}`,
                  )
                }
              >
                Open AI Advisor
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ContainerRow({ container }: { container: FinancialContainer }) {
  const meta = getContainerMeta(container.type);
  const liability = isLiabilityType(container.type);
  return (
    <li className="flex min-w-0 items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
        <StatusDot color={container.color || meta.defaultColor} className="shrink-0" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-sm text-[var(--ds-gray-1000)]">
            {container.name}
          </p>
          <p className="truncate text-xs text-[var(--ds-gray-700)]">{meta.label}</p>
        </div>
      </div>
      <p className="shrink-0 text-sm font-medium tabular-nums">
        {liability ? "−" : ""}
        {formatCurrency(container.balance, container.currency)}
      </p>
    </li>
  );
}

function AiInsight({
  text,
  tone,
  href,
}: {
  text: string;
  tone: "blue" | "green" | "orange" | "purple";
  href?: string;
}) {
  const body = (
    <div className="flex gap-2.5 rounded-[8px] bg-[var(--ds-background-100)] px-3 py-2.5 transition-colors hover:bg-[var(--ds-gray-100)]">
      <StatusDot tone={tone} className="mt-1" />
      <p className="text-xs leading-4 text-[var(--ds-gray-900)]">{text}</p>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {body}
      </Link>
    );
  }
  return body;
}
