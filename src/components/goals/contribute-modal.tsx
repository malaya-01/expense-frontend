"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/format";
import type { Goal } from "@/types";

export function ContributeModal({
  open,
  goal,
  onClose,
  onSubmit,
}: {
  open: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
}) {
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!goal || !amount || amount <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSubmit(amount);
      setAmount(0);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not contribute");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? `Contribute to ${goal.name}` : "Contribute"}
      className="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button form="contribute-form" type="submit" loading={loading}>
            Add
          </Button>
        </>
      }
    >
      <form id="contribute-form" onSubmit={handleSubmit} className="space-y-4">
        {goal ? (
          <p className="text-sm text-[var(--ds-gray-900)]">
            Saved{" "}
            {formatCurrency(goal.current_amount, goal.currency)} of{" "}
            {formatCurrency(goal.target_amount, goal.currency)}
          </p>
        ) : null}
        <div>
          <Label htmlFor="contrib-amount">Amount</Label>
          <Input
            id="contrib-amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="0.00"
          />
        </div>
        {error ? (
          <p className="text-sm text-[var(--ds-status-red)]">{error}</p>
        ) : null}
      </form>
    </Modal>
  );
}
