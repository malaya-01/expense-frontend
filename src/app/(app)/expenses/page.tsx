"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TransactionTable } from "@/components/expenses/expense-table";
import {
  deleteTransaction,
  listTransactions,
} from "@/lib/api/transactions";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/format";
import { getErrorMessage } from "@/lib/api/client";
import type { LedgerTransaction } from "@/types";

export default function ExpensesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listTransactions();
      setTransactions(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load transactions"));
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    refresh();
  }, [user?.id, refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...transactions].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    if (!q) return list;
    return list.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.merchant?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.source_name?.toLowerCase().includes(q) ||
        e.destination_name?.toLowerCase().includes(q) ||
        e.type.includes(q),
    );
  }, [transactions, query]);

  const baseCurrency = user?.currency || "USD";
  const outflow = filtered
    .filter((t) => t.type === "expense")
    .reduce((sum, e) => sum + Number(e.amount_base ?? e.amount), 0);
  const inflow = filtered
    .filter((t) => t.type === "income")
    .reduce((sum, e) => sum + Number(e.amount_base ?? e.amount), 0);

  return (
    <div>
      <PageHeader
        title="Transactions"
        description={`${filtered.length} shown · ${formatCurrency(inflow, baseCurrency)} in · ${formatCurrency(outflow, baseCurrency)} out · ${baseCurrency}`}
        actions={
          <Button onClick={() => router.push("/expenses/new")}>
            New transaction
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search description, container, merchant…"
          aria-label="Search transactions"
        />
      </div>

      {error ? (
        <p className="mb-4 text-sm text-[var(--ds-status-red)]">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--ds-gray-900)]">Loading transactions…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-[12px] bg-[var(--ds-background-elevated)] ds-border">
          <EmptyState
            title={query ? "No matches" : "No transactions yet"}
            description={
              query
                ? "Try a different search term."
                : "Record expense, income, or transfers between financial containers."
            }
            actionLabel={query ? undefined : "Add transaction"}
            onAction={query ? undefined : () => router.push("/expenses/new")}
          />
        </div>
      ) : (
        <TransactionTable
          transactions={filtered}
          baseCurrency={baseCurrency}
          onDelete={async (id) => {
            if (!window.confirm("Delete this transaction and reverse balances?")) {
              return;
            }
            try {
              await deleteTransaction(id);
              await refresh();
            } catch (err) {
              setError(getErrorMessage(err, "Could not delete transaction"));
            }
          }}
        />
      )}
    </div>
  );
}
