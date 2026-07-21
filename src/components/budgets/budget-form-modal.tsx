"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/currency.data";
import type { Budget, BudgetPeriod, Category, CreateBudgetInput } from "@/types";

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function BudgetFormModal({
  open,
  onClose,
  initial,
  categories,
  defaultCurrency = "USD",
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Budget | null;
  categories: Category[];
  defaultCurrency?: string;
  onSubmit: (input: CreateBudgetInput) => void;
}) {
  const [form, setForm] = useState<CreateBudgetInput>({
    name: "",
    amount: 0,
    period_type: "monthly",
    category_id: "",
    currency: defaultCurrency,
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        amount: initial.amount,
        period_type: initial.period_type,
        category_id: initial.category_id || "",
        currency: initial.currency,
        notes: initial.notes || "",
      });
    } else {
      setForm({
        name: "",
        amount: 0,
        period_type: "monthly",
        category_id: "",
        currency: defaultCurrency.toUpperCase(),
        notes: "",
      });
    }
  }, [open, initial, defaultCurrency]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.amount || form.amount <= 0) return;
    onSubmit({
      name: form.name.trim(),
      amount: Number(form.amount),
      period_type: form.period_type || "monthly",
      category_id: form.category_id || undefined,
      currency: (form.currency || defaultCurrency).toUpperCase(),
      notes: form.notes || undefined,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit budget" : "New budget"}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button form="budget-form" type="submit">
            {initial ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <form id="budget-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="budget-name">Name</Label>
          <Input
            id="budget-name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Groceries, Dining out, Overall…"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="budget-amount">Limit</Label>
            <Input
              id="budget-amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: Number(e.target.value) }))
              }
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="budget-currency">Currency</Label>
            <Select
              id="budget-currency"
              value={form.currency || defaultCurrency}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  currency: e.target.value.toUpperCase(),
                }))
              }
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="budget-period">Period</Label>
            <Select
              id="budget-period"
              value={form.period_type || "monthly"}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  period_type: e.target.value as BudgetPeriod,
                }))
              }
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="budget-category">Category</Label>
            <Select
              id="budget-category"
              value={form.category_id || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, category_id: e.target.value }))
              }
            >
              <option value="">All expenses</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="budget-notes">Notes</Label>
          <Textarea
            id="budget-notes"
            value={form.notes || ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional"
          />
        </div>
      </form>
    </Modal>
  );
}
