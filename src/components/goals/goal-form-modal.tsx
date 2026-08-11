"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/currency.data";
import { GOAL_TYPES } from "@/lib/goals/meta";
import type {
  CreateGoalInput,
  FinancialContainer,
  Goal,
  GoalType,
} from "@/types";

export function GoalFormModal({
  open,
  onClose,
  initial,
  containers,
  defaultCurrency = "USD",
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Goal | null;
  containers: FinancialContainer[];
  defaultCurrency?: string;
  onSubmit: (input: CreateGoalInput) => void | Promise<void>;
}) {
  const [form, setForm] = useState<CreateGoalInput>({
    name: "",
    goal_type: "other",
    target_amount: 0,
    current_amount: 0,
    currency: defaultCurrency,
    target_date: "",
    container_id: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        goal_type: initial.goal_type,
        target_amount: initial.target_amount,
        current_amount: initial.stored_current_amount ?? initial.current_amount,
        currency: initial.currency,
        target_date: initial.target_date || "",
        container_id: initial.container_id || "",
        notes: initial.notes || "",
      });
    } else {
      setForm({
        name: "",
        goal_type: "emergency_fund",
        target_amount: 0,
        current_amount: 0,
        currency: defaultCurrency.toUpperCase(),
        target_date: "",
        container_id: "",
        notes: "",
      });
    }
  }, [open, initial, defaultCurrency]);

  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!form.name.trim() || !form.target_amount || form.target_amount <= 0) {
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        goal_type: form.goal_type || "other",
        target_amount: Number(form.target_amount),
        current_amount: form.container_id
          ? undefined
          : Number(form.current_amount) || 0,
        currency: (form.currency || defaultCurrency).toUpperCase(),
        target_date: form.target_date || undefined,
        container_id: form.container_id || undefined,
        notes: form.notes || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const linked = Boolean(form.container_id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit goal" : "New goal"}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button form="goal-form" type="submit" loading={saving}>
            {initial ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <form id="goal-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <Label htmlFor="goal-name">Name</Label>
          <Input
            id="goal-name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Emergency fund, Bali trip…"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <div>
            <Label htmlFor="goal-type">Type</Label>
            <Select
              id="goal-type"
              value={form.goal_type || "other"}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  goal_type: e.target.value as GoalType,
                }))
              }
            >
              {GOAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="goal-currency">Currency</Label>
            <Select
              id="goal-currency"
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

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <div>
            <Label htmlFor="goal-target">Target amount</Label>
            <Input
              id="goal-target"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.target_amount || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  target_amount: Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="goal-date">Target date</Label>
            <Input
              id="goal-date"
              type="date"
              value={form.target_date || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, target_date: e.target.value }))
              }
            />
          </div>
        </div>

        <div>
          <Label htmlFor="goal-container">Linked account (optional)</Label>
          <Select
            id="goal-container"
            value={form.container_id || ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, container_id: e.target.value }))
            }
          >
            <option value="">Manual progress</option>
            {containers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.currency}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-[11px] text-[var(--ds-gray-700)]">
            Link a savings container to track its balance automatically.
          </p>
        </div>

        {!linked ? (
          <div>
            <Label htmlFor="goal-current">Already saved</Label>
            <Input
              id="goal-current"
              type="number"
              step="0.01"
              min="0"
              value={form.current_amount || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  current_amount: Number(e.target.value),
                }))
              }
            />
          </div>
        ) : null}

        <div>
          <Label htmlFor="goal-notes">Notes</Label>
          <Textarea
            id="goal-notes"
            value={form.notes || ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional"
          />
        </div>
      </form>
    </Modal>
  );
}
