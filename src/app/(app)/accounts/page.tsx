"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AccountCard } from "@/components/accounts/account-card";
import { AccountFormModal } from "@/components/accounts/account-form-modal";
import { summarizeTwin } from "@/lib/accounts/metrics";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
} from "@/lib/api/accounts";
import {
  CONTAINER_TYPES,
  GROUP_LABELS,
  getContainerMeta,
} from "@/lib/accounts/types-meta";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/format";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { CardGridSkeleton, PageSkeleton } from "@/components/ui/feedback";
import type { CreateContainerInput, FinancialContainer } from "@/types";

export default function AccountsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [containers, setContainers] = useState<FinancialContainer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialContainer | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const data = await listAccounts(user.id);
      setContainers(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load accounts"));
      setContainers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const baseCurrency = user?.currency || "USD";
  const summary = useMemo(
    () => summarizeTwin(containers, baseCurrency),
    [containers, baseCurrency],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, FinancialContainer[]>();
    for (const c of containers) {
      const group = getContainerMeta(c.type).group;
      const list = map.get(group) || [];
      list.push(c);
      map.set(group, list);
    }
    return CONTAINER_TYPES.map((t) => t.group)
      .filter((g, i, arr) => arr.indexOf(g) === i)
      .map((group) => ({
        group,
        label: GROUP_LABELS[group] || group,
        items: map.get(group) || [],
      }))
      .filter((g) => g.items.length > 0);
  }, [containers]);

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

  async function handleDelete(id: string) {
    if (!user?.id) return;
    setDeleteId(id);
  }

  if (!user?.id) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Financial Containers — every place value lives in your Digital Financial Twin."
        actions={
          <Button onClick={openCreate}>New container</Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          title="Net Worth"
          value={formatCurrency(summary.netWorth, baseCurrency)}
          subtitle={`Assets − liabilities · ${baseCurrency}`}
          tone="blue"
        />
        <MetricCard
          title="Total Cash"
          value={formatCurrency(summary.totalCash, baseCurrency)}
          subtitle={`Cash, wallets, banks · ${baseCurrency}`}
          tone="green"
        />
        <MetricCard
          title="Investments"
          value={formatCurrency(summary.investmentValue, baseCurrency)}
          subtitle={`Stocks, gold, crypto · ${baseCurrency}`}
          tone="purple"
        />
        <MetricCard
          title="Liabilities"
          value={formatCurrency(summary.totalLiabilities, baseCurrency)}
          subtitle={`Cards, loans, payables · ${baseCurrency}`}
          tone="orange"
        />
      </div>

      {error ? (
        <p className="mb-4 text-sm text-[var(--ds-status-red)]">{error}</p>
      ) : null}

      {loading ? (
        <CardGridSkeleton />
      ) : containers.length === 0 ? (
        <div className="rounded-[12px] bg-[var(--ds-background-elevated)] ds-border">
          <EmptyState
            title="No containers yet"
            description="Add cash, bank mirrors, credit cards, investments, or loans. Money never disappears — it moves between containers."
            actionLabel="Add first container"
            onAction={openCreate}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((section) => (
            <section key={section.group}>
              <h2 className="mb-3 text-[var(--ds-gray-1000)]">
                {section.label}
              </h2>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {section.items.map((container) => (
                  <AccountCard
                    key={container.id}
                    container={container}
                    onEdit={() => openEdit(container)}
                    onDelete={() => handleDelete(container.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

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
