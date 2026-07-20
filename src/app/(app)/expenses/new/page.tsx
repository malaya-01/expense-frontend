"use client";

import { PageHeader } from "@/components/ui/page-header";
import { TransactionForm } from "@/components/expenses/transaction-form";
import { Card, CardBody } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";

export default function NewExpensePage() {
  const { user } = useAuth();

  if (!user?.id) {
    return (
      <p className="text-sm text-[var(--ds-gray-900)]">Loading session…</p>
    );
  }

  return (
    <div>
      <PageHeader
        title="New transaction"
        description="Money never disappears — it moves between containers."
      />
      <Card>
        <CardBody className="pt-6">
          <TransactionForm userId={user.id} mode="create" />
        </CardBody>
      </Card>
    </div>
  );
}
