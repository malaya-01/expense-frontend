"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listCategories } from "@/lib/api/categories";
import { listAccounts } from "@/lib/api/accounts";
import {
  createTransaction,
  updateTransaction,
} from "@/lib/api/transactions";
import { formatCurrency, requireDateOnly, todayISO } from "@/lib/format";
import { getErrorMessage } from "@/lib/api/client";
import { getContainerMeta } from "@/lib/accounts/types-meta";
import { useToast } from "@/components/ui/toast";
import { convertAmount, getRate } from "@/lib/currency/currency.data";
import type {
  Category,
  CreateTransactionInput,
  FinancialContainer,
  LedgerTransaction,
  TransactionType,
} from "@/types";

type TransactionFormProps = {
  userId: string;
  initial?: LedgerTransaction | null;
  mode?: "create" | "edit";
  onSuccess?: () => void;
  onCancel?: () => void;
  formId?: string;
  hideActions?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

function containerLabel(c: FinancialContainer) {
  return `${c.name} · ${c.currency} · ${getContainerMeta(c.type).label}`;
}

export function TransactionForm({
  initial,
  mode = "create",
  onSuccess,
  onCancel,
  formId = "transaction-form",
  hideActions = false,
  onBusyChange,
}: TransactionFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [containers, setContainers] = useState<FinancialContainer[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateTransactionInput>({
    type: initial?.type ?? "expense",
    amount: initial?.amount ?? 0,
    description: initial?.description ?? "",
    date: requireDateOnly(initial?.date, todayISO()),
    category_id: initial?.category_id ?? "",
    source_container_id: initial?.source_container_id ?? "",
    destination_container_id: initial?.destination_container_id ?? "",
    merchant: initial?.merchant ?? "",
    currency: initial?.currency ?? "",
    exchange_rate: initial?.exchange_rate ?? undefined,
    notes: initial?.notes ?? "",
  });

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
    listAccounts()
      .then(setContainers)
      .catch(() => setContainers([]));
  }, []);

  const source = containers.find((c) => c.id === form.source_container_id);
  const destination = containers.find(
    (c) => c.id === form.destination_container_id,
  );
  const category = categories.find((c) => c.id === form.category_id);

  const needsSource =
    form.type === "expense" || form.type === "transfer";
  const needsDestination =
    form.type === "income" || form.type === "transfer";

  const sourceOptions = useMemo(() => {
    if (form.type !== "transfer" || !form.destination_container_id) {
      return containers;
    }
    return containers.filter((c) => c.id !== form.destination_container_id);
  }, [containers, form.type, form.destination_container_id]);

  const destinationOptions = useMemo(() => {
    if (form.type !== "transfer" || !form.source_container_id) {
      return containers;
    }
    return containers.filter((c) => c.id !== form.source_container_id);
  }, [containers, form.type, form.source_container_id]);

  const crossCurrency =
    form.type === "transfer" &&
    !!source &&
    !!destination &&
    source.currency !== destination.currency;

  const suggestedRate = useMemo(() => {
    if (!source || !destination) return 1;
    return getRate(source.currency, destination.currency);
  }, [source, destination]);

  useEffect(() => {
    if (!crossCurrency) return;
    if (form.exchange_rate === undefined || form.exchange_rate === null) {
      setForm((prev) => ({ ...prev, exchange_rate: suggestedRate }));
    }
  }, [crossCurrency, suggestedRate, form.exchange_rate]);

  const destPreview =
    crossCurrency && form.amount && (form.exchange_rate || suggestedRate)
      ? convertAmount(
          Number(form.amount),
          source!.currency,
          destination!.currency,
          form.exchange_rate || suggestedRate,
        )
      : null;

  function update<K extends keyof CreateTransactionInput>(
    key: K,
    value: CreateTransactionInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setType(type: TransactionType) {
    setForm((prev) => ({
      ...prev,
      type,
      source_container_id:
        type === "income" ? "" : prev.source_container_id,
      destination_container_id:
        type === "expense" ? "" : prev.destination_container_id,
      exchange_rate: undefined,
    }));
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
    if (containers.length === 0) {
      setError("Create a financial container in Accounts first.");
      return;
    }
    if (needsSource && !form.source_container_id) {
      setError("Select the source container (where money left).");
      return;
    }
    if (needsDestination && !form.destination_container_id) {
      setError("Select the destination container (where money arrived).");
      return;
    }
    if (
      form.type === "transfer" &&
      form.source_container_id === form.destination_container_id
    ) {
      setError("Transfer source and destination must be different.");
      return;
    }
    if (form.type === "transfer" && containers.length < 2) {
      setError("Transfers need at least two containers. Create another in Accounts.");
      return;
    }
    if (crossCurrency && (!form.exchange_rate || form.exchange_rate <= 0)) {
      setError("Enter an exchange rate for this cross-currency transfer.");
      return;
    }

    setLoading(true);
    onBusyChange?.(true);
    try {
      const payload: CreateTransactionInput & {
        source_name?: string;
        destination_name?: string;
        category_name?: string;
      } = {
        type: form.type,
        amount: Number(form.amount),
        description: form.description.trim(),
        date: form.date,
        category_id: form.category_id || undefined,
        source_container_id: form.source_container_id || undefined,
        destination_container_id: form.destination_container_id || undefined,
        merchant: form.merchant || undefined,
        notes: form.notes || undefined,
        // Match server: native currency comes from the primary container.
        currency: (
          (form.type === "expense" || form.type === "transfer"
            ? source?.currency
            : destination?.currency) ||
          source?.currency ||
          destination?.currency ||
          form.currency ||
          undefined
        )?.toUpperCase(),
        exchange_rate: crossCurrency
          ? Number(form.exchange_rate || suggestedRate)
          : undefined,
        // Keep list labels correct even if Dexie account cache is stale.
        source_name: source?.name,
        destination_name: destination?.name,
        category_name: category?.name,
      };

      if (mode === "edit" && initial) {
        await updateTransaction(initial.id, payload);
      } else {
        await createTransaction(payload);
      }
      showToast({
        title: mode === "edit" ? "Transaction updated" : "Transaction recorded",
        description: "Your account balances and financial twin are up to date.",
        tone: "success",
      });
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/expenses");
      }
      router.refresh();
    } catch (err) {
      const message = getErrorMessage(err, "Could not save transaction");
      setError(message);
      showToast({
        title: "Transaction not saved",
        description: message,
        tone: "error",
      });
    } finally {
      setLoading(false);
      onBusyChange?.(false);
    }
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-5">
      <div>
        <Label htmlFor="type">Type</Label>
        <Select
          id="type"
          value={form.type}
          onChange={(e) => setType(e.target.value as TransactionType)}
        >
          <option value="expense">Expense — money left a container</option>
          <option value="income">Income — money entered a container</option>
          <option value="transfer">Transfer — move between containers</option>
        </Select>
        {form.type === "transfer" ? (
          <p className="mt-1.5 text-[11px] text-[var(--ds-gray-700)]">
            Choose both containers below: money leaves From and arrives in To.
          </p>
        ) : null}
      </div>

      {/* Containers immediately under type so transfer To is not buried off-screen. */}
      {(needsSource || needsDestination) && (
        <div
          className={
            needsSource && needsDestination
              ? "grid gap-4 rounded-[10px] bg-[var(--ds-background-100)] p-3.5 sm:grid-cols-2 sm:gap-5 sm:p-4"
              : undefined
          }
        >
          {needsSource ? (
            <div>
              <Label htmlFor="source">From (source container)</Label>
              <Select
                id="source"
                value={form.source_container_id || ""}
                onChange={(e) => {
                  const next = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    source_container_id: next,
                    destination_container_id:
                      prev.destination_container_id === next
                        ? ""
                        : prev.destination_container_id,
                    exchange_rate: undefined,
                  }));
                }}
                required
              >
                <option value="">Select container</option>
                {sourceOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {containerLabel(c)}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {needsDestination ? (
            <div>
              <Label htmlFor="destination">To (destination container)</Label>
              <Select
                id="destination"
                value={form.destination_container_id || ""}
                onChange={(e) => {
                  const next = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    destination_container_id: next,
                    source_container_id:
                      prev.source_container_id === next
                        ? ""
                        : prev.source_container_id,
                    exchange_rate: undefined,
                  }));
                }}
                required
              >
                <option value="">Select container</option>
                {destinationOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {containerLabel(c)}
                  </option>
                ))}
              </Select>
              {form.type === "transfer" && containers.length < 2 ? (
                <p className="mt-1.5 text-[11px] text-[var(--ds-status-orange)]">
                  You need a second container for transfers.{" "}
                  <button
                    type="button"
                    className="text-[var(--ds-focus-color)]"
                    onClick={() => router.push("/accounts")}
                  >
                    Create one in Accounts
                  </button>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="amount">
            Amount
            {source
              ? ` (${source.currency})`
              : destination
                ? ` (${destination.currency})`
                : ""}
          </Label>
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
          placeholder="Coffee, salary, rent transfer…"
        />
      </div>

      {crossCurrency ? (
        <div className="rounded-[8px] bg-[var(--ds-background-100)] p-4 space-y-3">
          <div>
            <Label htmlFor="fx">
              Exchange rate ({source?.currency} → {destination?.currency})
            </Label>
            <Input
              id="fx"
              type="number"
              step="0.000001"
              min="0"
              required
              value={form.exchange_rate ?? suggestedRate}
              onChange={(e) =>
                update("exchange_rate", Number(e.target.value))
              }
            />
            <p className="mt-1 text-[11px] text-[var(--ds-gray-700)]">
              How many {destination?.currency} you receive per 1{" "}
              {source?.currency}. Suggested: {suggestedRate.toFixed(6)}
            </p>
          </div>
          {destPreview !== null ? (
            <p className="text-sm text-[var(--ds-gray-900)]">
              Destination will receive{" "}
              <span className="font-medium tabular-nums">
                {formatCurrency(destPreview, destination!.currency)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

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
          <Label htmlFor="merchant">Merchant</Label>
          <Input
            id="merchant"
            value={form.merchant || ""}
            onChange={(e) => update("merchant", e.target.value)}
            placeholder="Optional"
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

      {containers.length === 0 ? (
        <p className="text-sm text-[var(--ds-status-orange)]">
          No containers yet.{" "}
          <button
            type="button"
            className="text-[var(--ds-focus-color)]"
            onClick={() => router.push("/accounts")}
          >
            Create one in Accounts
          </button>{" "}
          before recording money movement.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--ds-status-red)]">{error}</p>
      ) : null}

      {!hideActions ? (
        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" loading={loading}>
            {mode === "edit" ? "Save changes" : "Record transaction"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => (onCancel ? onCancel() : router.push("/expenses"))}
          >
            Cancel
          </Button>
        </div>
      ) : null}
    </form>
  );
}
