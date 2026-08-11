"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorField } from "@/components/ui/color-field";
import { CONTAINER_TYPES, getContainerMeta } from "@/lib/accounts/types-meta";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/currency.data";
import type {
  ContainerType,
  CreateContainerInput,
  FinancialContainer,
} from "@/types";

const EMPTY: CreateContainerInput = {
  name: "",
  type: "bank",
  balance: 0,
  currency: "USD",
  institution: "",
  color: "#0072F5",
  notes: "",
  include_in_net_worth: true,
};

export function AccountFormModal({
  open,
  onClose,
  initial,
  onSubmit,
  defaultCurrency = "USD",
}: {
  open: boolean;
  onClose: () => void;
  initial?: FinancialContainer | null;
  onSubmit: (input: CreateContainerInput) => void | Promise<void>;
  defaultCurrency?: string;
}) {
  const [form, setForm] = useState<CreateContainerInput>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        type: initial.type,
        balance: initial.balance,
        currency: initial.currency,
        institution: initial.institution || "",
        color: initial.color || getContainerMeta(initial.type).defaultColor,
        notes: initial.notes || "",
        include_in_net_worth: initial.include_in_net_worth,
      });
    } else {
      setForm({ ...EMPTY, currency: defaultCurrency.toUpperCase() });
    }
  }, [open, initial, defaultCurrency]);

  function setType(type: ContainerType) {
    const meta = getContainerMeta(type);
    setForm((f) => ({
      ...f,
      type,
      color: meta.defaultColor,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving || !form.name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        balance: Number(form.balance) || 0,
        institution: form.institution || undefined,
        notes: form.notes || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const meta = getContainerMeta(form.type);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit container" : "New financial container"}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button form="account-form" type="submit" loading={saving}>
            {initial ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <form id="account-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <Label htmlFor="acc-name">Name</Label>
          <Input
            id="acc-name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Salary account, Cash wallet…"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <div>
            <Label htmlFor="acc-type">Type</Label>
            <Select
              id="acc-type"
              value={form.type}
              onChange={(e) => setType(e.target.value as ContainerType)}
            >
              {CONTAINER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-[var(--ds-gray-700)]">
              {meta.isLiability
                ? "Liability — outstanding amount owed"
                : "Asset — value you hold"}
            </p>
          </div>
          <div>
            <Label htmlFor="acc-balance">
              {meta.isLiability ? "Outstanding balance" : "Current balance"}
            </Label>
            <Input
              id="acc-balance"
              type="number"
              step="0.01"
              value={form.balance}
              onChange={(e) =>
                setForm((f) => ({ ...f, balance: Number(e.target.value) }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <div>
            <Label htmlFor="acc-currency">Currency</Label>
            <Select
              id="acc-currency"
              required
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
            <p className="mt-1 text-[11px] text-[var(--ds-gray-700)]">
              Balance is stored in this currency.
            </p>
          </div>
          <div>
            <Label htmlFor="acc-institution">Institution</Label>
            <Input
              id="acc-institution"
              value={form.institution || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, institution: e.target.value }))
              }
              placeholder="HDFC, PhonePe, optional"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="acc-color">Color</Label>
          <ColorField
            id="acc-color"
            value={form.color || meta.defaultColor}
            onChange={(color) => setForm((current) => ({ ...current, color }))}
          />
        </div>

        <div>
          <Label htmlFor="acc-notes">Notes</Label>
          <Textarea
            id="acc-notes"
            value={form.notes || ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional"
          />
        </div>

        <Checkbox
          id="include-net-worth"
          checked={form.include_in_net_worth ?? true}
          onChange={(checked) =>
            setForm((current) => ({
              ...current,
              include_in_net_worth: checked,
            }))
          }
          label="Include in net worth"
          description="Assets add to net worth; liabilities reduce it."
        />
      </form>
    </Modal>
  );
}
