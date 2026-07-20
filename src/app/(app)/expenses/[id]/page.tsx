"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TransactionForm } from "@/components/expenses/transaction-form";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTransaction } from "@/lib/api/transactions";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/api/client";
import type { LedgerTransaction } from "@/types";

export default function EditExpensePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [tx, setTx] = useState<LedgerTransaction | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    getTransaction(params.id)
      .then(setTx)
      .catch((err) => {
        setError(getErrorMessage(err, "Transaction not found"));
        setTx(null);
      });
  }, [params.id]);

  if (!user?.id || tx === undefined) {
    return <p className="text-sm text-[var(--ds-gray-900)]">Loading…</p>;
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
    </div>
  );
}
