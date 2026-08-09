"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  CircleDollarSign,
  PieChart,
  Plus,
  TrendingUp,
} from "lucide-react";
import { EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ModuleHeader } from "@/components/ui/module-header";
import { SummaryKpiCard } from "@/components/ui/summary-kpi-card";
import { HoldingCard } from "@/components/investments/holding-card";
import { HoldingFormModal } from "@/components/investments/holding-form-modal";
import {
  createInvestment,
  deleteInvestment,
  listInvestments,
  updateInvestment,
} from "@/lib/api/investments";
import { listAccounts } from "@/lib/api/accounts";
import { useAuth } from "@/lib/auth-context";
import { useModulePermissions } from "@/components/permissions/permission-gate";
import { formatCurrency } from "@/lib/format";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { CardGridSkeleton } from "@/components/ui/feedback";
import { ASSET_TYPES, assetTypeLabel } from "@/lib/investments/meta";
import type {
  CreateInvestmentInput,
  FinancialContainer,
  InvestmentHolding,
  InvestmentSummary,
} from "@/types";

const EMPTY_SUMMARY: InvestmentSummary = {
  base_currency: "USD",
  holding_count: 0,
  total_value: 0,
  total_cost: 0,
  total_gain: 0,
  gain_percent: 0,
  allocation: [],
};

export default function InvestmentsPage() {
  const perms = useModulePermissions("investments");
  const { user } = useAuth();
  const { showToast } = useToast();
  const [holdings, setHoldings] = useState<InvestmentHolding[]>([]);
  const [summary, setSummary] = useState<InvestmentSummary>(EMPTY_SUMMARY);
  const [containers, setContainers] = useState<FinancialContainer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InvestmentHolding | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<InvestmentHolding | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState("all");

  const baseCurrency = user?.currency || summary.base_currency || "USD";

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const [payload, accountRows] = await Promise.all([
        listInvestments(),
        listAccounts(user.id).catch(() => [] as FinancialContainer[]),
      ]);
      setHoldings(payload.holdings);
      setSummary(payload.summary);
      setContainers(accountRows);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load investments"));
      setHoldings([]);
      setSummary(EMPTY_SUMMARY);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filterOptions = useMemo(() => {
    const present = new Set(holdings.map((h) => h.asset_type));
    const fromMeta = ASSET_TYPES.filter((t) => present.has(t.value));
    const extras = [...present]
      .filter((t) => !ASSET_TYPES.some((a) => a.value === t))
      .map((t) => ({ value: t, label: assetTypeLabel(t) }));
    return [
      { value: "all", label: "All asset types" },
      ...fromMeta,
      ...extras,
    ];
  }, [holdings]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return holdings.filter((holding) => {
      if (assetFilter !== "all" && holding.asset_type !== assetFilter) {
        return false;
      }
      if (!q) return true;
      return (
        holding.name.toLowerCase().includes(q) ||
        (holding.symbol || "").toLowerCase().includes(q) ||
        assetTypeLabel(holding.asset_type).toLowerCase().includes(q)
      );
    });
  }, [holdings, search, assetFilter]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  async function handleSubmit(input: CreateInvestmentInput) {
    try {
      if (editing) {
        await updateInvestment(editing.id, input);
      } else {
        await createInvestment(input);
      }
      showToast({
        title: editing ? "Holding updated" : "Holding added",
        description: "Portfolio value and allocation were recalculated.",
        tone: "success",
      });
      setModalOpen(false);
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save holding"));
    }
  }

  const gainPositive = summary.total_gain >= 0;

  return (
    <div>
      <ModuleHeader
        title="Investments"
        description="Where is my wealth growing? Holdings, cost basis, and allocation inside your twin."
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search holdings..."
        filter={assetFilter}
        onFilterChange={setAssetFilter}
        filterOptions={filterOptions}
        filterLabel="Asset type"
        actions={
          perms.create ? (
            <Button onClick={openCreate} className="shrink-0">
              <Plus size={16} />
              New holding
            </Button>
          ) : null
        }
      />

      {error ? (
        <p className="mb-4 text-sm text-[var(--ds-status-red)]">{error}</p>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-3 xl:grid-cols-4">
        <SummaryKpiCard
          title="Portfolio value"
          value={formatCurrency(summary.total_value, baseCurrency)}
          subtitle={`${summary.holding_count} holding${summary.holding_count === 1 ? "" : "s"} · ${baseCurrency}`}
          icon={Briefcase}
          tone="purple"
          footerLeft={{
            label: "Holdings",
            value: String(summary.holding_count),
          }}
          footerRight={{
            label: "Currency",
            value: baseCurrency,
          }}
        />
        <SummaryKpiCard
          title="Cost basis"
          value={formatCurrency(summary.total_cost, baseCurrency)}
          subtitle="Total invested"
          icon={CircleDollarSign}
          tone="blue"
        />
        <SummaryKpiCard
          title="Unrealized P/L"
          value={`${gainPositive ? "+" : ""}${formatCurrency(summary.total_gain, baseCurrency)}`}
          subtitle={`${gainPositive ? "+" : ""}${summary.gain_percent.toFixed(1)}%`}
          icon={TrendingUp}
          tone={gainPositive ? "green" : "red"}
        />
        <SummaryKpiCard
          title="Top allocation"
          value={
            summary.allocation[0]
              ? assetTypeLabel(summary.allocation[0].asset_type)
              : "—"
          }
          subtitle={
            summary.allocation[0]
              ? `${summary.allocation[0].percent.toFixed(0)}% of portfolio`
              : "Add holdings"
          }
          icon={PieChart}
          tone="cyan"
        />
      </div>

      {summary.allocation.length > 0 ? (
        <div className="mb-6 rounded-[12px] bg-[var(--ds-background-elevated)] p-3 sm:rounded-[16px] sm:p-4 ds-border sm:p-5">
          <h2 className="text-sm font-medium text-[var(--ds-gray-1000)]">
            Allocation
          </h2>
          <div className="mt-4 space-y-3">
            {summary.allocation.map((row) => (
              <div key={row.asset_type}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-[var(--ds-gray-1000)]">
                    {assetTypeLabel(row.asset_type)}
                  </span>
                  <span className="tabular-nums text-[var(--ds-gray-900)]">
                    {formatCurrency(row.value, baseCurrency)} ·{" "}
                    {row.percent.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ds-gray-100)]">
                  <div
                    className="h-full rounded-full bg-[var(--ds-status-purple)] transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.min(100, row.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <CardGridSkeleton />
      ) : holdings.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--ds-background-elevated)] ds-border">
          <EmptyState
            title="No holdings yet"
            description="Add stocks, funds, gold, or crypto. Link an investment container to keep net worth in sync."
            actionLabel={perms.create ? "Add holding" : undefined}
            onAction={perms.create ? openCreate : undefined}
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--ds-background-elevated)] px-5 py-10 text-center ds-border">
          <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
            No holdings match your filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
          {visible.map((h) => (
            <HoldingCard
              key={h.id}
              holding={h}
              onEdit={
                perms.update
                  ? () => {
                      setEditing(h);
                      setModalOpen(true);
                    }
                  : undefined
              }
              onDelete={perms.delete ? () => setDeleteTarget(h) : undefined}
            />
          ))}
        </div>
      )}

      <HoldingFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        initial={editing}
        containers={containers}
        defaultCurrency={baseCurrency}
        onSubmit={handleSubmit}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete holding?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed from portfolio tracking.`
            : undefined
        }
        confirmLabel="Delete holding"
        destructive
        busy={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            await deleteInvestment(deleteTarget.id);
            setDeleteTarget(null);
            await refresh();
            showToast({
              title: "Holding deleted",
              description: "Portfolio metrics were refreshed.",
              tone: "success",
            });
          } catch (err) {
            setError(getErrorMessage(err, "Could not delete holding"));
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
