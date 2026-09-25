"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CreditCard,
  Filter,
  Landmark,
  PiggyBank,
  Plus,
  Search,
  Scale,
  Users,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AccountCard } from "@/components/accounts/account-card";
import { AccountFormModal } from "@/components/accounts/account-form-modal";
import { AccountKpiCard } from "@/components/accounts/account-kpi-card";
import { AccountsSidebar } from "@/components/accounts/accounts-sidebar";
import { TRANSACTION_CREATED_EVENT } from "@/components/expenses/transaction-modal-provider";
import { useReceiptCapture } from "@/components/receipts/receipt-capture-provider";
import { summarizeTwin } from "@/lib/accounts/metrics";
import {
  allocationSlices,
  buildAccountInsights,
  buildKpiSeries,
  groupAccent,
  groupSectionTotal,
  recentAccountActivity,
} from "@/lib/accounts/insights";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
} from "@/lib/api/accounts";
import { listTransactions } from "@/lib/api/transactions";
import {
  CONTAINER_TYPES,
  GROUP_LABELS,
  getContainerMeta,
  isExpenseSourceType,
} from "@/lib/accounts/types-meta";
import { useAuth } from "@/lib/auth-context";
import { useInfiniteList } from "@/hooks/use-infinite-list";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { useModulePermissions } from "@/components/permissions/permission-gate";
import { formatCurrency } from "@/lib/format";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { CardGridSkeleton, PageSkeleton } from "@/components/ui/feedback";
import type {
  CreateContainerInput,
  FinancialContainer,
  LedgerTransaction,
} from "@/types";

type GroupFilter = "all" | "liquid" | "invest" | "credit" | "people" | "other";

function sectionIcon(group: string) {
  switch (group) {
    case "liquid":
      return Landmark;
    case "invest":
      return PiggyBank;
    case "credit":
      return CreditCard;
    case "people":
      return Users;
    default:
      return Building2;
  }
}

export default function AccountsPage() {
  const perms = useModulePermissions("accounts");
  const { user } = useAuth();
  const { showToast } = useToast();
  const { startReceiptCapture } = useReceiptCapture();
  const [containers, setContainers] = useState<FinancialContainer[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialContainer | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const [accounts, txns] = await Promise.all([
        listAccounts(user.id),
        listTransactions().catch(() => [] as LedgerTransaction[]),
      ]);
      setContainers(accounts);
      setTransactions(txns);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load accounts"));
      setContainers([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
    const onSync = () => void refresh();
    window.addEventListener("finos:sync-complete", onSync);
    window.addEventListener(TRANSACTION_CREATED_EVENT, onSync);
    return () => {
      window.removeEventListener("finos:sync-complete", onSync);
      window.removeEventListener(TRANSACTION_CREATED_EVENT, onSync);
    };
  }, [refresh]);

  const baseCurrency = user?.currency || "USD";
  const summary = useMemo(
    () => summarizeTwin(containers, baseCurrency),
    [containers, baseCurrency],
  );
  const series = useMemo(
    () => buildKpiSeries(containers, transactions, summary, baseCurrency),
    [containers, transactions, summary, baseCurrency],
  );
  const allocation = useMemo(() => allocationSlices(summary), [summary]);
  const insights = useMemo(
    () => buildAccountInsights(summary, containers, transactions),
    [summary, containers, transactions],
  );
  const activity = useMemo(
    () => recentAccountActivity(containers, transactions, 8),
    [containers, transactions],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return containers.filter((container) => {
      const group = getContainerMeta(container.type).group;
      if (groupFilter !== "all" && group !== groupFilter) return false;
      if (!q) return true;
      return (
        container.name.toLowerCase().includes(q) ||
        (container.institution || "").toLowerCase().includes(q) ||
        getContainerMeta(container.type).label.toLowerCase().includes(q)
      );
    });
  }, [containers, search, groupFilter]);

  const list = useInfiniteList(filtered, {
    pageSize: 20,
    resetKey: `${search}|${groupFilter}`,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, FinancialContainer[]>();
    for (const c of list.items) {
      const group = getContainerMeta(c.type).group;
      const items = map.get(group) || [];
      items.push(c);
      map.set(group, items);
    }
    return CONTAINER_TYPES.map((t) => t.group)
      .filter((g, i, arr) => arr.indexOf(g) === i)
      .map((group) => ({
        group,
        label: GROUP_LABELS[group] || group,
        items: map.get(group) || [],
        accent: groupAccent(group),
        total: groupSectionTotal(map.get(group) || [], baseCurrency),
      }))
      .filter((g) => g.items.length > 0);
  }, [list.items, baseCurrency]);

  const liquidCount = containers.filter((c) =>
    ["cash", "wallet", "bank"].includes(c.type),
  ).length;
  const investCount = containers.filter((c) =>
    ["investment", "gold", "crypto"].includes(c.type),
  ).length;
  const liabilityCount = containers.filter((c) =>
    getContainerMeta(c.type).isLiability,
  ).length;
  const latestUpdate = containers
    .map((c) => c.updated_at)
    .sort()
    .at(-1);
  const updatedLabel = latestUpdate
    ? new Date(latestUpdate).toDateString() === new Date().toDateString()
      ? "Today"
      : new Date(latestUpdate).toLocaleDateString()
    : "—";

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(container: FinancialContainer) {
    setEditing(container);
    setModalOpen(true);
  }

  async function handleSave(input: CreateContainerInput) {
    if (!user?.id) return;
    setError("");
    try {
      if (editing) {
        await updateAccount(user.id, editing.id, input);
      } else {
        await createAccount(user.id, input);
      }
      setModalOpen(false);
      showToast({
        title: editing ? "Account updated" : "Account created",
        description: "Your financial twin has been refreshed.",
        tone: "success",
      });
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save container"));
    }
  }

  if (!user?.id) {
    return <PageSkeleton />;
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <div className="mb-3 sm:mb-5">
        <div className="min-w-0">
          <h1 className="sr-only sm:not-sr-only sm:text-[28px] sm:font-semibold sm:tracking-[-0.04em] sm:text-[var(--ds-gray-1000)]">
            Accounts
          </h1>
          <p className="line-clamp-2 max-w-xl text-[13px] leading-5 text-[var(--ds-gray-700)] sm:mt-1 sm:line-clamp-none sm:text-sm">
            Financial containers — every place value lives in your Digital
            Financial Twin.
          </p>
        </div>
        <div className="mt-2.5 flex items-center gap-2 sm:mt-3">
          <div className="min-w-0 flex-1 sm:max-w-xs sm:flex-none sm:w-56">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search accounts..."
              aria-label="Search accounts"
              startAdornment={<Search size={14} aria-hidden />}
              className="h-10"
            />
          </div>
          <div className="w-[8.5rem] shrink-0 sm:w-44">
            <Select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value as GroupFilter)}
              aria-label="Filter accounts"
              startAdornment={<Filter size={14} aria-hidden />}
              className="h-10"
            >
              <option value="all">All accounts</option>
              <option value="liquid">Cash & banks</option>
              <option value="invest">Investments</option>
              <option value="credit">Credit & loans</option>
              <option value="people">People</option>
              <option value="other">Other</option>
            </Select>
          </div>
          {perms.create ? (
            <div className="shrink-0">
              <Button onClick={openCreate} className="h-10 gap-1 px-3 text-[12px] sm:px-4 sm:text-[13px]">
                <Plus size={15} />
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">Add account</span>
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-4 grid min-w-0 grid-cols-2 gap-2 sm:mb-6 sm:gap-3 xl:grid-cols-4">
        <AccountKpiCard
          title="Net Worth"
          value={summary.netWorth}
          currency={baseCurrency}
          delta={series.netWorthDelta}
          series={series.netWorth}
          icon={Scale}
          accent="#2563EB"
          footerLeft={{
            label: "Assets",
            value: formatCurrency(summary.totalAssets, baseCurrency),
          }}
          footerRight={{
            label: "Liabilities",
            value: formatCurrency(summary.totalLiabilities, baseCurrency),
          }}
        />
        <AccountKpiCard
          title="Total Cash"
          value={summary.totalCash}
          currency={baseCurrency}
          delta={series.cashDelta}
          series={series.cash}
          icon={Wallet}
          accent="#16A34A"
          footerLeft={{
            label: "Accounts",
            value: String(liquidCount),
          }}
          footerRight={{
            label: "Updated",
            value: updatedLabel,
          }}
        />
        <AccountKpiCard
          title="Investments"
          value={summary.investmentValue}
          currency={baseCurrency}
          delta={series.investmentsDelta}
          series={series.investments}
          icon={PiggyBank}
          accent="#7C3AED"
          footerLeft={{
            label: "Share",
            value:
              summary.totalAssets > 0
                ? `${((summary.investmentValue / summary.totalAssets) * 100).toFixed(1)}%`
                : "—",
          }}
          footerRight={{
            label: "Accounts",
            value: String(investCount),
          }}
        />
        <AccountKpiCard
          title="Liabilities"
          value={summary.totalLiabilities}
          currency={baseCurrency}
          delta={series.liabilitiesDelta}
          series={series.liabilities}
          icon={CreditCard}
          accent="#F97316"
          invertDelta
          footerLeft={{
            label: "Accounts",
            value: String(liabilityCount),
          }}
          footerRight={{
            label: "Due soon",
            value: formatCurrency(0, baseCurrency),
          }}
        />
      </div>

      {error ? (
        <p className="mb-4 text-sm text-[var(--ds-status-red)]">{error}</p>
      ) : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div className="min-w-0 max-w-full overflow-hidden">
          {loading ? (
            <CardGridSkeleton />
          ) : containers.length === 0 ? (
            <div className="rounded-[16px] bg-[var(--ds-background-elevated)] ds-border">
              <EmptyState
                title="No accounts yet"
                description="Add cash, bank mirrors, credit cards, investments, or loans. Money never disappears — it moves between containers."
                actionLabel={perms.create ? "Add first account" : undefined}
                onAction={perms.create ? openCreate : undefined}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[16px] bg-[var(--ds-background-elevated)] px-5 py-10 text-center ds-border">
              <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
                No accounts match your filters
              </p>
              <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                Try a different search or clear the group filter.
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-7">
              {grouped.map((section) => {
                const Icon = sectionIcon(section.group);
                return (
                  <section key={section.group}>
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex size-8 items-center justify-center rounded-[10px]"
                          style={{
                            color: section.accent,
                            background: `color-mix(in srgb, ${section.accent} 14%, transparent)`,
                          }}
                        >
                          <Icon size={15} strokeWidth={1.9} />
                        </span>
                        <div>
                          <h2 className="text-sm font-semibold text-[var(--ds-gray-1000)]">
                            {section.label}
                          </h2>
                          <p className="text-[11px] text-[var(--ds-gray-700)]">
                            {section.items.length}{" "}
                            {section.items.length === 1 ? "Account" : "Accounts"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
                          Total balance
                        </p>
                        <p
                          className="text-sm font-semibold tabular-nums"
                          style={{ color: section.accent }}
                        >
                          {formatCurrency(section.total, baseCurrency)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {section.items.map((container) => (
                        <AccountCard
                          key={container.id}
                          container={container}
                          onScanReceipt={
                            isExpenseSourceType(container.type)
                              ? () =>
                                  startReceiptCapture({
                                    source_container_id: container.id,
                                  })
                              : undefined
                          }
                          onEdit={
                            perms.update
                              ? () => openEdit(container)
                              : undefined
                          }
                          onDelete={
                            perms.delete
                              ? () => setDeleteId(container.id)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </section>
                );
              })}

              <InfiniteScrollSentinel
                hasMore={list.hasMore}
                loading={list.loadingMore}
                onLoadMore={list.loadMore}
              />
            </div>
          )}
        </div>

        <div className="min-w-0 max-w-full overflow-hidden">
          <AccountsSidebar
            insights={insights}
            allocation={allocation}
            activity={activity}
            currency={baseCurrency}
          />
        </div>
      </div>

      <AccountFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
        onSubmit={handleSave}
        defaultCurrency={baseCurrency}
      />
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Archive financial container?"
        description="The container will no longer accept transactions, but its immutable ledger history remains available for reporting."
        confirmLabel="Archive container"
        destructive
        busy={deleting}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId || !user?.id) return;
          setDeleting(true);
          setError("");
          try {
            await deleteAccount(user.id, deleteId);
            setDeleteId(null);
            await refresh();
            showToast({
              title: "Account archived",
              description: "The financial container is no longer active.",
              tone: "success",
            });
          } catch (err) {
            setError(getErrorMessage(err, "Could not archive container"));
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
