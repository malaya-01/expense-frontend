"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CircleDollarSign,
  PiggyBank,
  Plus,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ModuleHeader } from "@/components/ui/module-header";
import { SummaryKpiCard } from "@/components/ui/summary-kpi-card";
import { BudgetCard } from "@/components/budgets/budget-card";
import { BudgetFormModal } from "@/components/budgets/budget-form-modal";
import {
  createBudget,
  deleteBudget,
  listBudgets,
  updateBudget,
} from "@/lib/api/budgets";
import { listCategories } from "@/lib/api/categories";
import { useAuth } from "@/lib/auth-context";
import { useModulePermissions } from "@/components/permissions/permission-gate";
import { formatCurrency } from "@/lib/format";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { CardGridSkeleton } from "@/components/ui/feedback";
import type { Budget, Category, CreateBudgetInput } from "@/types";

type StatusFilter = "all" | "on_track" | "warning" | "over";

export default function BudgetsPage() {
  const perms = useModulePermissions("budgets");
  const { user } = useAuth();
  const { showToast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const baseCurrency = user?.currency || "USD";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [budgetRows, categoryRows] = await Promise.all([
        listBudgets(),
        listCategories().catch(() => [] as Category[]),
      ]);
      setBudgets(budgetRows);
      setCategories(categoryRows);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load budgets"));
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void refresh();
  }, [user?.id, refresh]);

  const summary = useMemo(() => {
    const totalLimit = budgets.reduce((s, b) => s + b.amount, 0);
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
    const overCount = budgets.filter((b) => b.status === "over").length;
    const warningCount = budgets.filter((b) => b.status === "warning").length;
    return {
      totalLimit,
      totalSpent,
      remaining: totalLimit - totalSpent,
      overCount,
      warningCount,
      onTrack: budgets.length - overCount - warningCount,
    };
  }, [budgets]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return budgets.filter((budget) => {
      if (statusFilter !== "all" && budget.status !== statusFilter) return false;
      if (!q) return true;
      return (
        budget.name.toLowerCase().includes(q) ||
        (budget.category_name || "").toLowerCase().includes(q)
      );
    });
  }, [budgets, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  async function handleSubmit(input: CreateBudgetInput) {
    try {
      if (editing) {
        await updateBudget(editing.id, input);
      } else {
        await createBudget(input);
      }
      showToast({
        title: editing ? "Budget updated" : "Budget created",
        description: "Spending will be tracked against this plan automatically.",
        tone: "success",
      });
      setModalOpen(false);
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save budget"));
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Budgets"
        description="Am I on track this month? Limits vs ledger spend in your base currency."
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search budgets..."
        filter={statusFilter}
        onFilterChange={(value) => setStatusFilter(value as StatusFilter)}
        filterOptions={[
          { value: "all", label: "All statuses" },
          { value: "on_track", label: "On track" },
          { value: "warning", label: "Near limit" },
          { value: "over", label: "Over budget" },
        ]}
        actions={
          perms.create ? (
            <Button onClick={openCreate} className="shrink-0">
              <Plus size={16} />
              New budget
            </Button>
          ) : null
        }
      />

      {error ? (
        <p className="mb-4 text-sm text-[var(--ds-status-red)]">{error}</p>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-3 xl:grid-cols-4">
        <SummaryKpiCard
          title="Budgeted"
          value={formatCurrency(summary.totalLimit, baseCurrency)}
          subtitle={`${budgets.length} envelope${budgets.length === 1 ? "" : "s"}`}
          icon={PiggyBank}
          tone="blue"
          footerLeft={{ label: "Envelopes", value: String(budgets.length) }}
          footerRight={{
            label: "On track",
            value: String(summary.onTrack),
          }}
        />
        <SummaryKpiCard
          title="Spent this period"
          value={formatCurrency(summary.totalSpent, baseCurrency)}
          subtitle="From ledger expenses"
          icon={Wallet}
          tone="orange"
        />
        <SummaryKpiCard
          title="Remaining"
          value={formatCurrency(summary.remaining, baseCurrency)}
          subtitle={
            summary.remaining < 0 ? "Overall overspend" : "Across envelopes"
          }
          icon={CircleDollarSign}
          tone={summary.remaining < 0 ? "red" : "green"}
        />
        <SummaryKpiCard
          title="Health"
          value={
            budgets.length === 0
              ? "—"
              : summary.overCount > 0
                ? `${summary.overCount} over`
                : summary.warningCount > 0
                  ? `${summary.warningCount} near`
                  : "On track"
          }
          subtitle={`${summary.onTrack} healthy`}
          icon={AlertTriangle}
          tone={
            summary.overCount > 0
              ? "red"
              : summary.warningCount > 0
                ? "orange"
                : "green"
          }
        />
      </div>

      {loading ? (
        <CardGridSkeleton />
      ) : budgets.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--ds-background-elevated)] ds-border">
          <EmptyState
            title="No budgets yet"
            description="Create monthly or weekly envelopes. Spend is calculated live from your transactions."
            actionLabel={perms.create ? "Create budget" : undefined}
            onAction={perms.create ? openCreate : undefined}
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--ds-background-elevated)] px-5 py-10 text-center ds-border">
          <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
            No budgets match your filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
          {visible.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              onEdit={
                perms.update
                  ? () => {
                      setEditing(b);
                      setModalOpen(true);
                    }
                  : undefined
              }
              onDelete={perms.delete ? () => setDeleteTarget(b) : undefined}
            />
          ))}
        </div>
      )}

      <BudgetFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        initial={editing}
        categories={categories}
        defaultCurrency={baseCurrency}
        onSubmit={handleSubmit}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete budget?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed. Your transactions are not affected.`
            : undefined
        }
        confirmLabel="Delete budget"
        destructive
        busy={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            await deleteBudget(deleteTarget.id);
            setDeleteTarget(null);
            await refresh();
            showToast({
              title: "Budget deleted",
              description: "Existing transactions were not changed.",
              tone: "success",
            });
          } catch (err) {
            setError(getErrorMessage(err, "Could not delete budget"));
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
