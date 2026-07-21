"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TransactionForm } from "@/components/expenses/transaction-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getTransaction,
  getTransactionJournal,
} from "@/lib/api/transactions";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/api/client";
import type { LedgerJournal, LedgerTransaction } from "@/types";
import { Badge, PageSkeleton } from "@/components/ui/feedback";
import { formatCurrency } from "@/lib/format";

export default function EditExpensePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [tx, setTx] = useState<LedgerTransaction | null | undefined>(undefined);
  const [journals, setJournals] = useState<LedgerJournal[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getTransaction(params.id),
      getTransactionJournal(params.id).catch(() => []),
    ])
      .then(([transaction, journalRows]) => {
        setTx(transaction);
        setJournals(journalRows);
      })
      .catch((err) => {
        setError(getErrorMessage(err, "Transaction not found"));
        setTx(null);
      });
  }, [params.id]);

  if (!user?.id || tx === undefined) {
    return <PageSkeleton />;
  }

  if (!tx) {
    return (
      <div>
        <PageHeader title="Transaction not found" description={error} />
        <Button variant="secondary" onClick={() => router.push("/expenses")}>
          Back to transactions
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit transaction"
        description="Balances will be reversed and re-posted when you save."
      />
      <Card>
        <CardBody className="pt-6">
          <TransactionForm userId={user.id} initial={tx} mode="edit" />
        </CardBody>
      </Card>
      <Card className="mt-5">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={16}
                className="text-[var(--ds-status-green)]"
              />
              <h2>Immutable ledger history</h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--ds-gray-700)]">
              Every edit or deletion creates balanced reversing entries. Posted
              lines are never modified.
            </p>
          </div>
          <Badge tone="success">Double-entry</Badge>
        </CardHeader>
        <CardBody className="space-y-3">
          {journals.length ? (
            journals.map((journal) => (
              <div
                key={journal.id}
                className="rounded-[11px] bg-[var(--ds-background-100)] p-3 ds-border"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {journal.reversal_of_journal_id ? (
                      <RotateCcw
                        size={14}
                        className="text-[var(--ds-status-orange)]"
                      />
                    ) : (
                      <ShieldCheck
                        size={14}
                        className="text-[var(--ds-status-green)]"
                      />
                    )}
                    <span className="text-xs font-medium">
                      {journal.reversal_of_journal_id
                        ? "Reversing journal"
                        : "Posted journal"}
                    </span>
                  </div>
                  <Badge
                    tone={journal.status === "posted" ? "success" : "neutral"}
                  >
                    {journal.status}
                  </Badge>
                </div>
                <div className="divide-y divide-[var(--ds-gray-200)]">
                  {journal.lines.map((line) => {
                    const debit = line.debit_base > 0;
                    return (
                      <div
                        key={line.id}
                        className="flex items-center justify-between gap-4 py-2 text-xs"
                      >
                        <span className="min-w-0 truncate text-[var(--ds-gray-900)]">
                          {line.container_name ||
                            line.account_code
                              ?.split(":")
                              .map(
                                (part) =>
                                  part.charAt(0).toUpperCase() + part.slice(1),
                              )
                              .join(" · ") ||
                            "Ledger account"}
                        </span>
                        <span className="shrink-0 font-mono tabular-nums">
                          <span className="mr-2 text-[10px] text-[var(--ds-gray-700)]">
                            {debit ? "DR" : "CR"}
                          </span>
                          {formatCurrency(
                            debit ? line.debit_base : line.credit_base,
                            user.currency || "USD",
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 truncate font-mono text-[9px] text-[var(--ds-gray-700)]">
                  Correlation {journal.correlation_id}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-[var(--ds-gray-700)]">
              Journal history will appear after the ledger migration is applied.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
