"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardBody } from "@/components/ui/card";
import { Alert, Badge, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
    return list.filter(
      (e) => {
        const matchesQuery =
          !q ||
          e.description.toLowerCase().includes(q) ||
          e.merchant?.toLowerCase().includes(q) ||
          e.notes?.toLowerCase().includes(q) ||
          e.source_name?.toLowerCase().includes(q) ||
          e.destination_name?.toLowerCase().includes(q) ||
          e.type.includes(q);
        return (
          matchesQuery &&
          (typeFilter === "all" || e.type === typeFilter) &&
          (currencyFilter === "all" ||
            (e.currency || "USD") === currencyFilter) &&
          (!dateFrom || e.date >= dateFrom) &&
          (!dateTo || e.date <= dateTo)
        );
      },
    );
  }, [
    transactions,
    query,
    typeFilter,
    currencyFilter,
    dateFrom,
    dateTo,
  ]);

  const baseCurrency = user?.currency || "USD";
  const outflow = filtered
    .filter((t) => t.type === "expense")
    .reduce((sum, e) => sum + Number(e.amount_base ?? e.amount), 0);
  const inflow = filtered
    .filter((t) => t.type === "income")
    .reduce((sum, e) => sum + Number(e.amount_base ?? e.amount), 0);
  const currencies = useMemo(
    () =>
      [...new Set(transactions.map((transaction) => transaction.currency || "USD"))]
        .sort(),
    [transactions],
  );
  const hasFilters =
    Boolean(query || dateFrom || dateTo) ||
    typeFilter !== "all" ||
    currencyFilter !== "all";

  function clearFilters() {
    setQuery("");
    setTypeFilter("all");
    setCurrencyFilter("all");
    setDateFrom("");
    setDateTo("");
  }

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

      <Card className="mb-5">
        <CardBody className="pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal
                size={15}
                className="text-[var(--ds-gray-700)]"
              />
              <h2>Find transactions</h2>
              {hasFilters ? <Badge tone="info">Filtered</Badge> : null}
            </div>
            {hasFilters ? (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                <X size={13} />
                Clear
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_160px_130px_150px_150px]">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-3.5 z-10 text-[var(--ds-gray-700)]"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Merchant, category, account, notes…"
                aria-label="Search transactions"
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              aria-label="Filter by transaction type"
            >
              <option value="all">All types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </Select>
            <Select
              value={currencyFilter}
              onChange={(event) => setCurrencyFilter(event.target.value)}
              aria-label="Filter by currency"
            >
              <option value="all">All currencies</option>
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              aria-label="Transactions from date"
            />
            <Input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
              aria-label="Transactions to date"
            />
          </div>
        </CardBody>
      </Card>

      {error ? (
        <Alert
          className="mb-4"
          tone="error"
          title="Transactions could not be loaded"
          description={error}
          actionLabel="Retry"
          onAction={() => void refresh()}
        />
      ) : null}

      {loading ? (
        <div className="space-y-2 rounded-[14px] bg-[var(--ds-background-elevated)] p-4 ds-border">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[12px] bg-[var(--ds-background-elevated)] ds-border">
          <EmptyState
            title={hasFilters ? "No matching transactions" : "No transactions yet"}
            description={
              hasFilters
                ? "Adjust or clear the filters to see more results."
                : "Record expense, income, or transfers between financial containers."
            }
            actionLabel={hasFilters ? "Clear filters" : "Add transaction"}
            onAction={
              hasFilters ? clearFilters : () => router.push("/expenses/new")
            }
          />
        </div>
      ) : (
        <TransactionTable
          transactions={filtered}
          baseCurrency={baseCurrency}
          onDelete={setDeleteId}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete transaction?"
        description="This removes the transaction and reverses its account balance effects."
        confirmLabel="Delete transaction"
        destructive
        busy={deleting}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          setDeleting(true);
          try {
            await deleteTransaction(deleteId);
            setDeleteId(null);
            await refresh();
            showToast({
              title: "Transaction deleted",
              description: "Account balances were reversed.",
              tone: "success",
            });
          } catch (err) {
            setError(getErrorMessage(err, "Could not delete transaction"));
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
