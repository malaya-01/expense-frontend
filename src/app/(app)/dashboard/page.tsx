"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import { listAccounts } from "@/lib/api/accounts";
import { listTransactions } from "@/lib/api/transactions";
import { summarizeTwin } from "@/lib/accounts/metrics";
import { getContainerMeta, isLiabilityType } from "@/lib/accounts/types-meta";
import { useAuth } from "@/lib/auth-context";
import {
  formatCurrency,
  formatRelativeDay,
  monthKey,
} from "@/lib/format";
import type { FinancialContainer, LedgerTransaction } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [containers, setContainers] = useState<FinancialContainer[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    listTransactions()
      .then(setTransactions)
      .catch(() => setTransactions([]));
    listAccounts(user.id)
      .then(setContainers)
      .catch(() => setContainers([]));
  }, [user?.id]);

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

  return (
    <div>
      <PageHeader
        title={firstName ? `${firstName}'s FinOS` : "Financial Twin"}
        description="Where is your money, where did it go, and what should you do next?"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => router.push("/accounts")}>
              Accounts
            </Button>
            <Button onClick={() => router.push("/expenses/new")}>
              New transaction
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          title="Monthly Cash Flow"
          value={formatCurrency(stats.inflow - stats.outflow, baseCurrency)}
          subtitle={`${formatCurrency(stats.inflow, baseCurrency)} in · ${formatCurrency(stats.outflow, baseCurrency)} out · ${stats.count} tx`}
          tone="orange"
        />
        <MetricCard
          title="Financial Health"
          value={`${stats.healthScore}`}
          subtitle={
            twin.totalLiabilities > 0
              ? `${formatCurrency(twin.totalLiabilities, baseCurrency)} liabilities`
              : "No liabilities tracked"
          }
          tone="purple"
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
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
                actionLabel="Add transaction"
                onAction={() => router.push("/expenses/new")}
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
                      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <StatusDot tone={tone} />
                        <div className="min-w-0">
                          <p className="truncate text-sm tabular-nums text-[var(--ds-gray-1000)]">
                            {tx.description}
                          </p>
                          <p className="text-xs text-[var(--ds-gray-700)]">
                            {formatRelativeDay(tx.date)} · {flow}
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
            <CardHeader>
              <h2>What should I know?</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <AiInsight
                tone="blue"
                text={
                  twin.containerCount === 0
                    ? "Create financial containers to unlock real net worth."
                    : `Your twin tracks ${twin.containerCount} container${twin.containerCount === 1 ? "" : "s"} totaling ${formatCurrency(twin.netWorth, baseCurrency)} net worth.`
                }
              />
              <AiInsight
                tone="green"
                text={
                  twin.totalCash > 0
                    ? `Liquid cash on hand: ${formatCurrency(twin.totalCash, baseCurrency)}.`
                    : "Add a cash or bank container to track liquidity."
                }
              />
              <AiInsight
                tone="orange"
                text={
                  twin.totalLiabilities > 0
                    ? `Outstanding liabilities: ${formatCurrency(twin.totalLiabilities, baseCurrency)}.`
                    : "No credit or loan containers yet."
                }
              />
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
    <li className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <StatusDot color={container.color || meta.defaultColor} />
        <div className="min-w-0">
          <p className="truncate text-sm text-[var(--ds-gray-1000)]">
            {container.name}
          </p>
          <p className="text-xs text-[var(--ds-gray-700)]">{meta.label}</p>
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
}: {
  text: string;
  tone: "blue" | "green" | "orange";
}) {
  return (
    <div className="flex gap-2.5 rounded-[8px] bg-[var(--ds-background-100)] px-3 py-2.5">
      <StatusDot tone={tone} className="mt-1" />
      <p className="text-xs leading-4 text-[var(--ds-gray-900)]">{text}</p>
    </div>
  );
}
