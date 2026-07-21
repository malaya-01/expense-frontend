"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MetricCard } from "@/components/dashboard/metric-card";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalFormModal } from "@/components/goals/goal-form-modal";
import { ContributeModal } from "@/components/goals/contribute-modal";
import {
  contributeToGoal,
  createGoal,
  deleteGoal,
  listGoals,
  updateGoal,
} from "@/lib/api/goals";
import { listAccounts } from "@/lib/api/accounts";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/format";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { CardGridSkeleton } from "@/components/ui/feedback";
import type {
  CreateGoalInput,
  FinancialContainer,
  Goal,
} from "@/types";

export default function GoalsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [containers, setContainers] = useState<FinancialContainer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const baseCurrency = user?.currency || "USD";

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const [goalRows, accountRows] = await Promise.all([
        listGoals(),
        listAccounts(user.id).catch(() => [] as FinancialContainer[]),
      ]);
      setGoals(goalRows);
      setContainers(accountRows);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load goals"));
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const summary = useMemo(() => {
    const target = goals.reduce((s, g) => s + g.target_amount, 0);
    const saved = goals.reduce((s, g) => s + g.current_amount, 0);
    const achieved = goals.filter((g) => g.status === "achieved").length;
    const behind = goals.filter(
      (g) => g.status === "behind" || g.status === "at_risk",
    ).length;
    const surplus = goals[0]?.monthly_surplus ?? 0;
    return { target, saved, achieved, behind, surplus };
  }, [goals]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  async function handleSubmit(input: CreateGoalInput) {
    try {
      const payload: Partial<CreateGoalInput> = {
        name: input.name,
        goal_type: input.goal_type,
        target_amount: input.target_amount,
        currency: input.currency,
        target_date: input.target_date || null,
        notes: input.notes,
        container_id: input.container_id || null,
      };
      if (!input.container_id) {
        payload.current_amount = input.current_amount ?? 0;
      }
      if (editing) {
        await updateGoal(editing.id, payload);
      } else {
        await createGoal({
          ...input,
          container_id: input.container_id || undefined,
        });
      }
      showToast({
        title: editing ? "Goal updated" : "Goal created",
        description: "FinOS recalculated your progress and forecast.",
        tone: "success",
      });
      setModalOpen(false);
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save goal"));
    }
  }

  return (
    <div>
      <PageHeader
        title="Goals"
        description="Where is my money going? Track targets with predicted completion from your surplus."
        actions={<Button onClick={openCreate}>New goal</Button>}
      />

      {error ? (
        <p className="mb-4 text-sm text-[var(--ds-status-red)]">{error}</p>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Targeted"
          value={formatCurrency(summary.target, baseCurrency)}
          subtitle={`${goals.length} goal${goals.length === 1 ? "" : "s"}`}
        />
        <MetricCard
          title="Saved"
          value={formatCurrency(summary.saved, baseCurrency)}
          subtitle={
            summary.target > 0
              ? `${Math.round((summary.saved / summary.target) * 100)}% of targets`
              : "Toward goals"
          }
          tone="teal"
        />
        <MetricCard
          title="Monthly surplus"
          value={formatCurrency(summary.surplus, baseCurrency)}
          subtitle="90-day average (income − spend)"
          tone={summary.surplus >= 0 ? "green" : "orange"}
        />
        <MetricCard
          title="Status"
          value={
            goals.length === 0
              ? "—"
              : summary.achieved === goals.length
                ? "All done"
                : summary.behind > 0
                  ? `${summary.behind} behind`
                  : "On track"
          }
          subtitle={`${summary.achieved} achieved`}
        />
      </div>

      {loading ? (
        <CardGridSkeleton />
      ) : goals.length === 0 ? (
        <div className="rounded-[12px] bg-[var(--ds-background-elevated)] ds-border">
          <EmptyState
            title="No goals yet"
            description="Set an emergency fund, vacation, or house down payment. Link a savings account or contribute manually."
            actionLabel="Create goal"
            onAction={openCreate}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={() => {
                setEditing(g);
                setModalOpen(true);
              }}
              onContribute={() => setContributeGoal(g)}
              onDelete={() => setDeleteTarget(g)}
            />
          ))}
        </div>
      )}

      <GoalFormModal
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

      <ContributeModal
        open={Boolean(contributeGoal)}
        goal={contributeGoal}
        onClose={() => setContributeGoal(null)}
        onSubmit={async (amount) => {
          if (!contributeGoal) return;
          try {
            await contributeToGoal(contributeGoal.id, amount);
            await refresh();
          } catch (err) {
            throw new Error(getErrorMessage(err, "Could not contribute"));
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete goal?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” and its progress tracking will be removed. Linked account balances are not changed.`
            : undefined
        }
        confirmLabel="Delete goal"
        destructive
        busy={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            await deleteGoal(deleteTarget.id);
            setDeleteTarget(null);
            await refresh();
            showToast({
              title: "Goal deleted",
              description: "Linked account balances were not changed.",
              tone: "success",
            });
          } catch (err) {
            setError(getErrorMessage(err, "Could not delete goal"));
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
