"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpDown, ImageUp } from "lucide-react";
import { listCategories } from "@/lib/api/categories";
import { listAccounts } from "@/lib/api/accounts";
import {
  createTransaction,
  updateTransaction,
} from "@/lib/api/transactions";
import { formatCurrency, requireDateOnly, todayISO } from "@/lib/format";
import { BalanceImpact } from "@/components/expenses/balance-impact";
import { getErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { getContainerMeta } from "@/lib/accounts/types-meta";
import { useToast } from "@/components/ui/toast";
import { convertAmount, getRate } from "@/lib/currency/currency.data";
import { parseReceipt } from "@/lib/api/ai";
import { fileToReceiptPayload } from "@/lib/receipts/compress-image";
import {
  defaultsFromReceiptParse,
  isBlockedReceiptParse,
  localPaidAt,
  timeFromPaidAt,
} from "@/lib/receipts/defaults-from-parse";
import { matchExpenseSource } from "@/lib/receipts/match-container";
import { VisionSourceBadge } from "@/components/receipts/vision-source-badge";
import { ReceiptPreviewStage } from "@/components/receipts/receipt-preview-stage";
import { useGlobalLoader } from "@/components/brand/global-loader";
import { useAppSelector } from "@/lib/store/hooks";
import { selectPreferences } from "@/lib/preferences/slice";
import {
  transactionDefaultsFor,
  type TransactionTypeDefaults,
} from "@/lib/preferences/types";
import {
  readLastSourceContainerId,
  writeLastSourceContainerId,
} from "@/lib/receipts/last-container";
import type {
  Category,
  CreateTransactionInput,
  FinancialContainer,
  LedgerTransaction,
  ReceiptExtractedFields,
  TransactionType,
} from "@/types";

type TransactionFormProps = {
  userId: string;
  initial?: LedgerTransaction | null;
  defaults?: Partial<CreateTransactionInput>;
  fromReceipt?: boolean;
  receiptMatch?: Partial<ReceiptExtractedFields> | null;
  savedReceipt?: {
    id?: string | null;
    url?: string | null;
    mime?: string | null;
  } | null;
  allowReceiptUpload?: boolean;
  mode?: "create" | "edit";
  onSuccess?: () => void;
  onCancel?: () => void;
  formId?: string;
  hideActions?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onReceiptReading?: (label: string | null) => void;
  reading?: boolean;
  className?: string;
  onReceiptAttached?: (payload: {
    defaults: Partial<CreateTransactionInput>;
    previewUrl: string;
    previewName: string;
    notice?: string;
    visionProvider?: string | null;
    visionModel?: string | null;
    receiptMatch?: Partial<ReceiptExtractedFields> | null;
    receiptId?: string | null;
    receiptUrl?: string | null;
    receiptMime?: string | null;
  }) => void;
};

/** Defaults from Settings > Transactions (new transactions only). */
type PreferenceDefaults = {
  type: TransactionType;
  /** Each type keeps its own accounts / category. */
  byType: Record<TransactionType, TransactionTypeDefaults>;
};

function emptyTransaction(
  defaults?: Partial<CreateTransactionInput>,
  pref?: PreferenceDefaults,
): CreateTransactionInput {
  const type = defaults?.type ?? pref?.type ?? "expense";
  const typeDefaults = pref?.byType[type];
  return {
    type,
    amount: defaults?.amount ?? 0,
    description: defaults?.description ?? "",
    date: requireDateOnly(defaults?.date, todayISO()),
    category_id: defaults?.category_id ?? typeDefaults?.categoryId ?? "",
    source_container_id:
      defaults?.source_container_id ??
      (type === "income"
        ? ""
        : typeDefaults
          ? typeDefaults.sourceId
          : readLastSourceContainerId()),
    destination_container_id:
      defaults?.destination_container_id ?? typeDefaults?.destinationId ?? "",
    merchant: defaults?.merchant ?? "",
    currency: defaults?.currency ?? "",
    exchange_rate: defaults?.exchange_rate ?? undefined,
    notes: defaults?.notes ?? "",
    payment_method: defaults?.payment_method ?? "",
    upi_vpa: defaults?.upi_vpa ?? "",
    upi_txn_id: defaults?.upi_txn_id ?? "",
    payment_status: defaults?.payment_status ?? "",
    paid_at: defaults?.paid_at ?? "",
    platform: defaults?.platform ?? "",
    platform_txn_id: defaults?.platform_txn_id ?? "",
  };
}

/** Current local wall-clock time as HH:mm (default for new transactions). */
function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function FieldCard({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] bg-[var(--ds-gray-100)] px-3.5 py-2.5",
        className,
      )}
    >
      <Label
        htmlFor={htmlFor}
        className="mb-0.5 text-[11px] font-medium leading-4 text-[var(--ds-gray-700)]"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function containerLabel(c: FinancialContainer) {
  return `${c.name} · ${c.currency} · ${getContainerMeta(c.type).label}`;
}

export function TransactionForm({
  initial,
  defaults,
  fromReceipt = false,
  receiptMatch,
  savedReceipt = null,
  allowReceiptUpload = true,
  mode = "create",
  onSuccess,
  onCancel,
  formId = "transaction-form",
  hideActions = false,
  onBusyChange,
  onReceiptReading,
  reading = false,
  className,
  onReceiptAttached,
}: TransactionFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { show: showGlobalLoader } = useGlobalLoader();
  const [categories, setCategories] = useState<Category[]>([]);
  const [containers, setContainers] = useState<FinancialContainer[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const prefs = useAppSelector(selectPreferences);
  const isCreate = mode !== "edit" && !initial;
  // Resolved once per form mount (the modal remounts the form for each open).
  const [prefDefaults, setPrefDefaults] = useState<
    PreferenceDefaults | undefined
  >(() =>
    isCreate
      ? {
          type: prefs.default_transaction_type,
          byType: {
            expense: transactionDefaultsFor(
              prefs,
              "expense",
              readLastSourceContainerId(),
            ),
            income: transactionDefaultsFor(prefs, "income"),
            transfer: transactionDefaultsFor(
              prefs,
              "transfer",
              readLastSourceContainerId(),
            ),
          },
        }
      : undefined,
  );
  const [form, setForm] = useState<CreateTransactionInput>(() =>
    emptyTransaction({
      ...defaults,
      type: initial?.type ?? defaults?.type,
      amount: initial?.amount ?? defaults?.amount,
      description: initial?.description ?? defaults?.description,
      date: initial?.date ?? defaults?.date,
      category_id: initial?.category_id ?? defaults?.category_id,
      source_container_id:
        initial?.source_container_id ?? defaults?.source_container_id,
      destination_container_id:
        initial?.destination_container_id ?? defaults?.destination_container_id,
      merchant: initial?.merchant ?? defaults?.merchant,
      currency: initial?.currency ?? defaults?.currency,
      exchange_rate: initial?.exchange_rate ?? defaults?.exchange_rate,
      notes: initial?.notes ?? defaults?.notes,
      payment_method: initial?.payment_method ?? defaults?.payment_method,
      upi_vpa: initial?.upi_vpa ?? defaults?.upi_vpa,
      upi_txn_id: initial?.upi_txn_id ?? defaults?.upi_txn_id,
      payment_status: initial?.payment_status ?? defaults?.payment_status,
      paid_at: initial?.paid_at ?? defaults?.paid_at,
      platform: initial?.platform ?? defaults?.platform,
      platform_txn_id: initial?.platform_txn_id ?? defaults?.platform_txn_id,
    }, prefDefaults),
  );
  // Raw amount text so partial decimals like "0." / "0.05" survive typing;
  // re-synced whenever the numeric amount is changed elsewhere (receipt fill, reset).
  const [amountText, setAmountText] = useState(() =>
    form.amount ? String(form.amount) : "",
  );
  useEffect(() => {
    setAmountText((current) =>
      (Number(current) || 0) === (Number(form.amount) || 0)
        ? current
        : form.amount
          ? String(form.amount)
          : "",
    );
  }, [form.amount]);
  const [time, setTime] = useState(
    () =>
      timeFromPaidAt(initial?.paid_at || defaults?.paid_at) ||
      (mode === "create" ? nowTime() : ""),
  );
  const [showReceiptFields, setShowReceiptFields] = useState(
    () =>
      fromReceipt ||
      Boolean(
        initial?.upi_txn_id ||
          initial?.platform_txn_id ||
          defaults?.upi_txn_id ||
          defaults?.platform_txn_id ||
          defaults?.payment_method,
      ),
  );
  const [receiptNotice, setReceiptNotice] = useState("");
  const [attachedReceipt, setAttachedReceipt] = useState(savedReceipt);
  useEffect(() => {
    if (!savedReceipt?.id) return;
    setAttachedReceipt((current) =>
      current?.id === savedReceipt.id &&
      current?.url === savedReceipt.url &&
      current?.mime === savedReceipt.mime
        ? current
        : savedReceipt,
    );
  }, [savedReceipt]);
  const [localReading, setLocalReading] = useState<string | null>(null);
  const [visionSource, setVisionSource] = useState<{
    provider: string | null;
    model: string | null;
  } | null>(null);
  const [localPreview, setLocalPreview] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (localPreview?.url) URL.revokeObjectURL(localPreview.url);
    };
  }, [localPreview]);

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
    listAccounts()
      .then(setContainers)
      .catch(() => setContainers([]));
  }, []);

  // Drop preferred accounts / categories that no longer exist, both from the
  // form and from the per-type presets used when switching type.
  useEffect(() => {
    if (!prefDefaults || !containers.length || !categories.length) return;
    const accountIds = new Set(containers.map((c) => c.id));
    const categoryIds = new Set(categories.map((c) => c.id));
    const presets = Object.values(prefDefaults.byType);
    const stale = new Set<string>();
    for (const preset of presets) {
      for (const id of [preset.sourceId, preset.destinationId]) {
        if (id && !accountIds.has(id)) stale.add(id);
      }
      if (preset.categoryId && !categoryIds.has(preset.categoryId)) {
        stale.add(preset.categoryId);
      }
    }
    if (!stale.size) return;
    const clean = (id: string) => (stale.has(id) ? "" : id);
    setPrefDefaults({
      ...prefDefaults,
      byType: Object.fromEntries(
        Object.entries(prefDefaults.byType).map(([type, preset]) => [
          type,
          {
            sourceId: clean(preset.sourceId),
            destinationId: clean(preset.destinationId),
            categoryId: clean(preset.categoryId),
          },
        ]),
      ) as PreferenceDefaults["byType"],
    });
    setForm((prev) => ({
      ...prev,
      source_container_id: clean(prev.source_container_id || ""),
      destination_container_id: clean(prev.destination_container_id || ""),
      category_id: clean(prev.category_id || ""),
    }));
  }, [containers, categories, prefDefaults]);

  useEffect(() => {
    if (!containers.length || !receiptMatch) return;
    const sourceMatched = matchExpenseSource(containers, {
      container_name: receiptMatch.container_name,
      bank_name: receiptMatch.bank_name,
      account_last4: receiptMatch.account_last4,
      account_label:
        receiptMatch.account_label || receiptMatch.payment_method,
    });
    const destinationMatched = matchExpenseSource(
      containers,
      {
        container_name: receiptMatch.destination_container_name,
        bank_name: receiptMatch.destination_bank_name,
        account_last4: receiptMatch.destination_account_last4,
        account_label: receiptMatch.destination_account_label,
      },
      { excludeIds: sourceMatched ? [sourceMatched.id] : [] },
    );
    setForm((prev) => {
      let next = prev;
      const asTransfer =
        prev.type === "transfer" ||
        receiptMatch.transaction_type === "transfer" ||
        Boolean(
          sourceMatched &&
            destinationMatched &&
            sourceMatched.id !== destinationMatched.id,
        );
      if (
        asTransfer &&
        prev.type !== "transfer" &&
        sourceMatched &&
        destinationMatched &&
        sourceMatched.id !== destinationMatched.id
      ) {
        next = { ...next, type: "transfer" };
      }
      if (
        sourceMatched &&
        (fromReceipt || !prev.source_container_id) &&
        prev.source_container_id !== sourceMatched.id &&
        next.type !== "income"
      ) {
        next = { ...next, source_container_id: sourceMatched.id };
      }
      if (
        destinationMatched &&
        (fromReceipt || !prev.destination_container_id) &&
        prev.destination_container_id !== destinationMatched.id &&
        next.type !== "expense"
      ) {
        next = { ...next, destination_container_id: destinationMatched.id };
      }
      return next;
    });
  }, [containers, fromReceipt, receiptMatch]);

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
    setForm((prev) => {
      // New transactions: swap the previous type's defaults (Settings >
      // Transactions) for the new type's; values the user picked stay.
      const before = prefDefaults?.byType[prev.type];
      const after = prefDefaults?.byType[type];
      const picked = (value: string | undefined | null, preset?: string) =>
        value && value !== preset ? value : "";
      const source =
        type === "income"
          ? ""
          : picked(prev.source_container_id, before?.sourceId) ||
            after?.sourceId ||
            "";
      let destination =
        type === "expense"
          ? ""
          : picked(prev.destination_container_id, before?.destinationId) ||
            after?.destinationId ||
            "";
      if (destination && destination === source) destination = "";
      return {
        ...prev,
        type,
        source_container_id: source,
        destination_container_id: destination,
        category_id:
          picked(prev.category_id, before?.categoryId) ||
          after?.categoryId ||
          "",
        exchange_rate: undefined,
      };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
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
    const isEdit = mode === "edit" && Boolean(initial);
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
        // In edit mode an explicit null clears a previously set optional
        // field (the API accepts null on update); on create they are omitted.
        category_id: (form.category_id ||
          (isEdit ? null : undefined)) as CreateTransactionInput["category_id"],
        source_container_id: form.source_container_id || undefined,
        destination_container_id: form.destination_container_id || undefined,
        merchant: (form.merchant ||
          (isEdit ? null : undefined)) as CreateTransactionInput["merchant"],
        notes: (form.notes ||
          (isEdit ? null : undefined)) as CreateTransactionInput["notes"],
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
        payment_method: form.payment_method || undefined,
        upi_vpa: form.upi_vpa || undefined,
        upi_txn_id: form.upi_txn_id || undefined,
        payment_status: form.payment_status || undefined,
        paid_at: form.paid_at || localPaidAt(form.date, time),
        platform: form.platform || undefined,
        platform_txn_id: form.platform_txn_id || undefined,
        receipt_id: attachedReceipt?.id || undefined,
        receipt_url: attachedReceipt?.url || undefined,
        receipt_mime: attachedReceipt?.mime || undefined,
      };

      if (mode === "edit" && initial) {
        await updateTransaction(initial.id, payload);
      } else {
        await createTransaction(payload);
      }
      if (form.type === "expense" && form.source_container_id) {
        writeLastSourceContainerId(form.source_container_id);
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

  function reportReading(label: string | null) {
    setLocalReading(label);
    onReceiptReading?.(label);
    showGlobalLoader(label);
  }

  async function onReceiptSelected(file?: File) {
    if (!file) return;
    setError("");
    setVisionSource(null);
    setReceiptNotice("");
    reportReading("Reading receipt");
    let previewUrl = "";
    try {
      const payload = await fileToReceiptPayload(file);
      previewUrl = payload.preview_url;
      let parsed: Awaited<ReturnType<typeof parseReceipt>> | null = null;
      let notice = "Receipt fields filled. Review before saving.";
      try {
        parsed = await parseReceipt({
          name: payload.name,
          mime_type: payload.mime_type,
          data_base64: payload.data_base64,
        });
        if (parsed.stored && parsed.receipt_id) {
          notice =
            "Receipt fields filled. The scan will be attached to this transaction.";
        }
        if (parsed.warning) notice = parsed.warning;
      } catch (err) {
        notice = getErrorMessage(
          err,
          "Could not read this receipt. Fill the form yourself.",
        );
      }

      if (isBlockedReceiptParse(parsed)) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        showToast({
          title:
            parsed.blocked_reason === "pending_payment"
              ? "Payment still pending"
              : "Failed payment ignored",
          description:
            parsed.warning ||
            "This receipt was not turned into a transaction.",
          tone: "error",
        });
        return;
      }

      const next = defaultsFromReceiptParse(
        parsed,
        containers,
        form.source_container_id,
      );
      const nextTime =
        parsed?.extracted?.time || timeFromPaidAt(next.paid_at);
      const merged: Partial<CreateTransactionInput> = {
        ...form,
        ...next,
        source_container_id:
          next.source_container_id || form.source_container_id,
        destination_container_id:
          next.destination_container_id || form.destination_container_id,
        paid_at:
          localPaidAt(next.date || form.date, nextTime) || form.paid_at,
      };
      if (onReceiptAttached) {
        onReceiptAttached({
          defaults: merged,
          previewUrl,
          previewName: payload.name,
          notice,
          visionProvider: parsed?.used_provider,
          visionModel: parsed?.used_model,
          receiptMatch: parsed?.extracted,
          receiptId: parsed?.receipt_id,
          receiptUrl: parsed?.receipt_url,
          receiptMime: payload.mime_type,
        });
        return;
      }
      if (parsed?.receipt_id) {
        setAttachedReceipt({
          id: parsed.receipt_id,
          url: parsed.receipt_url,
          mime: payload.mime_type,
        });
      }
      if (localPreview?.url) URL.revokeObjectURL(localPreview.url);
      setLocalPreview({ url: previewUrl, name: payload.name });
      setForm((prev) => ({
        ...prev,
        ...next,
        source_container_id:
          next.source_container_id || prev.source_container_id,
        destination_container_id:
          next.destination_container_id || prev.destination_container_id,
        paid_at:
          localPaidAt(next.date || prev.date, nextTime) || prev.paid_at,
      }));
      if (nextTime) setTime(nextTime);
      setShowReceiptFields(true);
      setVisionSource({
        provider: parsed?.used_provider ?? null,
        model: parsed?.used_model ?? null,
      });
      setReceiptNotice(notice);
    } catch (err) {
      if (previewUrl && !onReceiptAttached) {
        URL.revokeObjectURL(previewUrl);
      }
      setReceiptNotice("");
      setError(
        getErrorMessage(err, "Could not read this receipt. Fill the form yourself."),
      );
    } finally {
      reportReading(null);
    }
  }

  return (
    <form
      id={formId}
      onSubmit={onSubmit}
      className={cn("w-full", className ?? "space-y-3.5 sm:space-y-5")}
    >
      {localPreview && !/\.pdf$/i.test(localPreview.name) ? (
        <ReceiptPreviewStage
          src={localPreview.url}
          alt={localPreview.name}
          onRemove={() => {
            if (localPreview.url) URL.revokeObjectURL(localPreview.url);
            setLocalPreview(null);
            setAttachedReceipt(null);
            setForm(emptyTransaction());
            setTime(nowTime());
            setShowReceiptFields(false);
            setVisionSource(null);
            setReceiptNotice("");
            setError("");
          }}
        />
      ) : null}
      {allowReceiptUpload && mode === "create" ? (
        <div>
          <input
            ref={receiptInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void onReceiptSelected(file);
            }}
          />
          <button
            type="button"
            onClick={() => receiptInputRef.current?.click()}
            disabled={Boolean(reading || localReading)}
            className="flex w-full items-center gap-3 rounded-[12px] border border-dashed border-[color:color-mix(in_srgb,var(--ds-gray-1000)_16%,transparent)] bg-[var(--ds-background-100)] px-3.5 py-3 text-left transition-colors hover:border-[color:color-mix(in_srgb,var(--ds-focus-color)_45%,transparent)] hover:bg-[color-mix(in_srgb,var(--ds-focus-color)_6%,var(--ds-background-100))] ds-focus disabled:pointer-events-none disabled:opacity-60"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--ds-background-elevated)] ds-border">
              <ImageUp size={16} className="text-[var(--ds-focus-color)]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-[var(--ds-gray-1000)]">
                Upload receipt
              </span>
              <span className="mt-0.5 block text-[12px] leading-4 text-[var(--ds-gray-700)]">
                Optional GPay, PhonePe, or Paytm screenshot. The scan is
                attached when you record.
              </span>
            </span>
          </button>
          {receiptNotice ? (
            <p className="mt-2 text-[12px] leading-4 text-[var(--ds-gray-700)]">
              {receiptNotice}
            </p>
          ) : null}
          {visionSource ? (
            <VisionSourceBadge
              className="mb-0 mt-2"
              provider={visionSource.provider}
              model={visionSource.model}
            />
          ) : null}
        </div>
      ) : null}
      <FieldCard label="Type" htmlFor="type">
        <Select
          id="type"
          embedded
          value={form.type}
          onChange={(e) => setType(e.target.value as TransactionType)}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </Select>
      </FieldCard>

      {(needsSource || needsDestination) && (
        <div className={cn(needsSource && needsDestination && "flex flex-col")}>
          {needsSource ? (
            <div>
              <FieldCard label="From" htmlFor="source" className={needsDestination ? "pr-14" : undefined}>
                <Select
                  id="source"
                  embedded
                  chevron={false}
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
              </FieldCard>
            </div>
          ) : null}

          {needsSource && needsDestination ? (
            <div className="relative z-10 -my-3 flex h-6 items-center justify-end pr-1">
              <button
                type="button"
                aria-label="Swap From and To containers"
                title="Swap From and To"
                disabled={
                  !form.source_container_id && !form.destination_container_id
                }
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    source_container_id: prev.destination_container_id,
                    destination_container_id: prev.source_container_id,
                    exchange_rate: undefined,
                  }));
                }}
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-[12px]",
                  "bg-white text-[#2f6bff]",
                  "shadow-[0_2px_10px_rgba(0,0,0,0.16)]",
                  "ds-focus disabled:cursor-not-allowed disabled:opacity-40",
                )}
              >
                <ArrowUpDown size={18} strokeWidth={2.25} />
              </button>
            </div>
          ) : null}

          {needsDestination ? (
            <FieldCard
              label="To"
              htmlFor="destination"
              className={needsSource ? "pr-14" : undefined}
            >
                <Select
                  id="destination"
                  embedded
                  chevron={false}
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
              </FieldCard>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
        <FieldCard
          className="col-span-2 sm:col-span-1"
          label={
            source
              ? `Amount (${source.currency})`
              : destination
                ? `Amount (${destination.currency})`
                : "Amount"
          }
          htmlFor="amount"
        >
          <Input
            id="amount"
            embedded
            type="number"
            step="0.01"
            min="0"
            required
            value={amountText}
            onChange={(e) => {
              const raw = e.target.value;
              setAmountText(raw);
              update("amount", Number(raw) || 0);
            }}
            placeholder="0.00"
          />
        </FieldCard>
        <FieldCard label="Date" htmlFor="date">
          <Input
            id="date"
            embedded
            type="date"
            className="[color-scheme:dark]"
            required
            value={form.date}
            onChange={(e) => {
              const next = e.target.value;
              setForm((prev) => ({
                ...prev,
                date: next,
                paid_at: localPaidAt(next, time) || prev.paid_at,
              }));
            }}
          />
        </FieldCard>
        <FieldCard label="Time" htmlFor="paid_time">
          <Input
            id="paid_time"
            embedded
            type="time"
            className="[color-scheme:dark]"
            value={time}
            onChange={(e) => {
              const next = e.target.value;
              setTime(next);
              setForm((prev) => ({
                ...prev,
                paid_at: localPaidAt(prev.date, next),
              }));
            }}
          />
        </FieldCard>
      </div>

      <BalanceImpact
        tx={{
          type: form.type,
          amount: Number(form.amount) || 0,
          exchange_rate: crossCurrency
            ? Number(form.exchange_rate || suggestedRate)
            : 1,
          source_container_id: needsSource ? form.source_container_id : null,
          destination_container_id: needsDestination
            ? form.destination_container_id
            : null,
        }}
        accounts={containers}
        replacing={mode === "edit" ? initial : null}
      />

      <FieldCard label="Description" htmlFor="description">
        <Input
          id="description"
          embedded
          required
          maxLength={500}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What this payment was for"
        />
      </FieldCard>

      {crossCurrency ? (
        <div className="space-y-2">
          <FieldCard
            label={`Exchange rate (${source?.currency} → ${destination?.currency})`}
            htmlFor="fx"
          >
            <Input
              id="fx"
              embedded
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
          </FieldCard>
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

      <div className="grid grid-cols-2 gap-2">
        <FieldCard label="Category" htmlFor="category">
          <Select
            id="category"
            embedded
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
        </FieldCard>
        <FieldCard label="Merchant" htmlFor="merchant">
          <Input
            id="merchant"
            embedded
            value={form.merchant || ""}
            onChange={(e) => update("merchant", e.target.value)}
            placeholder="Optional"
          />
        </FieldCard>
      </div>

      {showReceiptFields ? (
        <div className="grid grid-cols-2 gap-2">
          <FieldCard label="Payment method" htmlFor="payment_method">
            <Input
              id="payment_method"
              embedded
              value={form.payment_method || ""}
              onChange={(e) => update("payment_method", e.target.value)}
              placeholder="UPI, card, cash…"
            />
          </FieldCard>
          <FieldCard label="App / platform" htmlFor="platform">
            <Input
              id="platform"
              embedded
              value={form.platform || ""}
              onChange={(e) => update("platform", e.target.value)}
              placeholder="Google Pay, PhonePe…"
            />
          </FieldCard>
          <FieldCard label="UPI transaction ID" htmlFor="upi_txn_id">
            <Input
              id="upi_txn_id"
              embedded
              value={form.upi_txn_id || ""}
              onChange={(e) => update("upi_txn_id", e.target.value)}
              placeholder="Optional"
            />
          </FieldCard>
          <FieldCard label="Google / platform ID" htmlFor="platform_txn_id">
            <Input
              id="platform_txn_id"
              embedded
              value={form.platform_txn_id || ""}
              onChange={(e) => update("platform_txn_id", e.target.value)}
              placeholder="Google transaction ID"
            />
          </FieldCard>
        </div>
      ) : null}

      <FieldCard label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          plain
          value={form.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Optional notes"
          className="min-h-7 text-[15px] font-semibold placeholder:font-medium"
        />
      </FieldCard>

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
