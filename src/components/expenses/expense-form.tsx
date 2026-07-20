"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listCategories } from "@/lib/api/categories";
import {
  createLocalExpense,
  updateLocalExpense,
} from "@/lib/expenses-store";
import { todayISO } from "@/lib/format";
import { getErrorMessage } from "@/lib/api/client";
import type { Category, CreateExpenseInput, Expense } from "@/types";

const PAYMENT_METHODS = [
  "Cash",
  "Card",
  "UPI",
  "Bank transfer",
  "Other",
];

type ExpenseFormProps = {
  userId: string;
  initial?: Expense | null;
  mode?: "create" | "edit";
};

export function ExpenseForm({ userId, initial, mode = "create" }: ExpenseFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateExpenseInput>({
    amount: initial?.amount ?? 0,
    description: initial?.description ?? "",
    date: initial?.date?.slice(0, 10) ?? todayISO(),
    category_id: initial?.category_id ?? "",
    merchant: initial?.merchant ?? "",
    payment_method: initial?.payment_method ?? "",
    currency: initial?.currency ?? "USD",
    notes: initial?.notes ?? "",
  });

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  function update<K extends keyof CreateExpenseInput>(
    key: K,
    value: CreateExpenseInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.description.trim()) {
      setError("Description is required");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Amount must be greater than zero");
      return;
    }

    setLoading(true);
    try {
      const payload: CreateExpenseInput = {
        ...form,
        amount: Number(form.amount),
        category_id: form.category_id || undefined,
        merchant: form.merchant || undefined,
        payment_method: form.payment_method || undefined,
        notes: form.notes || undefined,
      };

      if (mode === "edit" && initial) {
        updateLocalExpense(initial.id, payload);
      } else {
        createLocalExpense(userId, payload);
      }
      router.push("/expenses");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save expense"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.amount || ""}
            onChange={(e) => update("amount", Number(e.target.value))}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            required
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          required
          maxLength={500}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Coffee, groceries, transit…"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            id="category"
            value={form.category_id || ""}
            onChange={(e) => update("category_id", e.target.value)}
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="payment">Payment method</Label>
          <Select
            id="payment"
            value={form.payment_method || ""}
            onChange={(e) => update("payment_method", e.target.value)}
          >
            <option value="">Select</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="merchant">Merchant</Label>
          <Input
            id="merchant"
            value={form.merchant || ""}
            onChange={(e) => update("merchant", e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            maxLength={3}
            value={form.currency || "USD"}
            onChange={(e) => update("currency", e.target.value.toUpperCase())}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={form.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Optional notes"
        />
      </div>

      {error ? (
        <p className="text-sm text-[var(--ds-status-red)]">{error}</p>
      ) : null}

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" loading={loading}>
          {mode === "edit" ? "Save changes" : "Add expense"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/expenses")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
