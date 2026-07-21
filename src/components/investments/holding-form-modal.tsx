"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/currency.data";
import { ASSET_TYPES } from "@/lib/investments/meta";
import type {
  AssetType,
  CreateInvestmentInput,
  FinancialContainer,
  InvestmentHolding,
} from "@/types";

export function HoldingFormModal({
  open,
  onClose,
  initial,
  containers,
  defaultCurrency = "USD",
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial?: InvestmentHolding | null;
  containers: FinancialContainer[];
  defaultCurrency?: string;
  onSubmit: (input: CreateInvestmentInput) => void;
}) {
  const [form, setForm] = useState<CreateInvestmentInput>({
    name: "",
    symbol: "",
    asset_type: "stock",
    quantity: 0,
    avg_cost: 0,
    current_price: 0,
    currency: defaultCurrency,
    container_id: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        symbol: initial.symbol || "",
        asset_type: initial.asset_type,
        quantity: initial.quantity,
        avg_cost: initial.avg_cost,
        current_price: initial.current_price,
        currency: initial.currency,
        container_id: initial.container_id || "",
        notes: initial.notes || "",
      });
    } else {
      setForm({
        name: "",
        symbol: "",
        asset_type: "stock",
        quantity: 0,
        avg_cost: 0,
        current_price: 0,
        currency: defaultCurrency.toUpperCase(),
        container_id: "",
        notes: "",
      });
    }
  }, [open, initial, defaultCurrency]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit({
      name: form.name.trim(),
      symbol: form.symbol?.trim() || undefined,
      asset_type: form.asset_type || "other",
      quantity: Number(form.quantity) || 0,
      avg_cost: Number(form.avg_cost) || 0,
      current_price: Number(form.current_price) || 0,
      currency: (form.currency || defaultCurrency).toUpperCase(),
      container_id: form.container_id || null,
      notes: form.notes || undefined,
    });
  }

  const investContainers = containers.filter((c) =>
    ["investment", "gold", "crypto"].includes(c.type),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit holding" : "New holding"}
      className="max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button form="holding-form" type="submit">
            {initial ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <form id="holding-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="hold-name">Name</Label>
            <Input
              id="hold-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="HDFC Bank, Bitcoin, Sovereign Gold…"
            />
          </div>
          <div>
            <Label htmlFor="hold-symbol">Symbol</Label>
            <Input
              id="hold-symbol"
              value={form.symbol || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, symbol: e.target.value }))
              }
              placeholder="Optional"
            />
          </div>
          <div>
            <Label htmlFor="hold-type">Asset type</Label>
            <Select
              id="hold-type"
              value={form.asset_type || "stock"}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  asset_type: e.target.value as AssetType,
                }))
              }
            >
              {ASSET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="hold-qty">Quantity</Label>
            <Input
              id="hold-qty"
              type="number"
              step="any"
              min="0"
              required
              value={form.quantity || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <Label htmlFor="hold-avg">Avg cost</Label>
            <Input
              id="hold-avg"
              type="number"
              step="any"
              min="0"
              required
              value={form.avg_cost || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, avg_cost: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <Label htmlFor="hold-price">Current price</Label>
            <Input
              id="hold-price"
              type="number"
              step="any"
              min="0"
              required
              value={form.current_price || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  current_price: Number(e.target.value),
                }))
              }
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="hold-currency">Currency</Label>
            <Select
              id="hold-currency"
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
          <div>
            <Label htmlFor="hold-container">Linked container</Label>
            <Select
              id="hold-container"
              value={form.container_id || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, container_id: e.target.value }))
              }
            >
              <option value="">None</option>
              {investContainers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.currency}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-[var(--ds-gray-700)]">
              Syncs that account’s balance to holding market value.
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="hold-notes">Notes</Label>
          <Textarea
            id="hold-notes"
            value={form.notes || ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional"
          />
        </div>
      </form>
    </Modal>
  );
}
