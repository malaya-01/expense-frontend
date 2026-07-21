"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MetricCard } from "@/components/dashboard/metric-card";
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
import { formatCurrency } from "@/lib/format";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { CardGridSkeleton } from "@/components/ui/feedback";
import type { Budget, Category, CreateBudgetInput } from "@/types";

export default function BudgetsPage() {
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
    refresh();
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
      <PageHeader
        title="Budgets"
        description="Am I on track this month? Limits vs ledger spend in your base currency."
        actions={
          <Button onClick={openCreate}>New budget</Button>
        }
      />

      {error ? (
        <p className="mb-4 text-sm text-[var(--ds-status-red)]">{error}</p>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Budgeted"
          value={formatCurrency(summary.totalLimit, baseCurrency)}
          subtitle={`${budgets.length} envelope${budgets.length === 1 ? "" : "s"}`}
        />
        <MetricCard
          title="Spent this period"
          value={formatCurrency(summary.totalSpent, baseCurrency)}
          subtitle="From ledger expenses"
        />
        <MetricCard
          title="Remaining"
          value={formatCurrency(summary.remaining, baseCurrency)}
          subtitle={
            summary.remaining < 0 ? "Overall overspend" : "Across envelopes"
          }
        />
        <MetricCard
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
        />
      </div>

      {loading ? (
        <CardGridSkeleton />
      ) : budgets.length === 0 ? (
        <div className="rounded-[12px] bg-[var(--ds-background-elevated)] ds-border">
          <EmptyState
            title="No budgets yet"
            description="Create monthly or weekly envelopes. Spend is calculated live from your transactions."
            actionLabel="Create budget"
            onAction={openCreate}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {budgets.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              onEdit={() => {
                setEditing(b);
                setModalOpen(true);
              }}
              onDelete={() => setDeleteTarget(b)}
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
