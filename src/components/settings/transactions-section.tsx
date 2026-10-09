"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/feedback";
import { getErrorMessage } from "@/lib/api/client";
import { listAccounts } from "@/lib/api/accounts";
import { listCategories } from "@/lib/api/categories";
import { getContainerMeta } from "@/lib/accounts/types-meta";
import { usePreferences } from "@/lib/preferences/use-preferences";
import type { UserPreferences } from "@/lib/preferences/types";
import type { Category, FinancialContainer, TransactionType } from "@/types";
import {
  SaveBar,
  SearchSelect,
  Segmented,
  SectionLoading,
  SettingRow,
  SettingsGroup,
  SwitchRow,
  useReportDirty,
  type SearchOption,
} from "./settings-ui";

type TxDraft = Pick<
  UserPreferences,
  | "default_transaction_type"
  | "default_expense_account_id"
  | "default_expense_category_id"
  | "default_income_account_id"
  | "default_income_category_id"
  | "default_transfer_from_account_id"
  | "default_transfer_to_account_id"
  | "remember_last_account"
  | "confirm_before_delete"
>;

type IdKey = Exclude<
  keyof TxDraft,
  "default_transaction_type" | "remember_last_account" | "confirm_before_delete"
>;

/** One group per type, each with its own fields, so nothing carries over. */
const TYPE_GROUPS: Array<{
  type: TransactionType;
  title: string;
  description: string;
  fields: Array<{ key: IdKey; label: string; kind: "account" | "category" }>;
}> = [
  {
    type: "expense",
    title: "Expense defaults",
    description: "Money going out.",
    fields: [
      { key: "default_expense_account_id", label: "Paid from", kind: "account" },
      { key: "default_expense_category_id", label: "Category", kind: "category" },
    ],
  },
  {
    type: "income",
    title: "Income defaults",
    description: "Money coming in.",
    fields: [
      { key: "default_income_account_id", label: "Received into", kind: "account" },
      { key: "default_income_category_id", label: "Category", kind: "category" },
    ],
  },
  {
    type: "transfer",
    title: "Transfer defaults",
    description: "Moving money between your own accounts.",
    fields: [
      { key: "default_transfer_from_account_id", label: "From", kind: "account" },
      { key: "default_transfer_to_account_id", label: "To", kind: "account" },
    ],
  },
];

const NONE = "__none__";

const TYPE_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

export function TransactionsSection({ canUpdate }: { canUpdate: boolean }) {
  const { prefs, save } = usePreferences();
  const { showToast } = useToast();
  const labelPrefix = useId();
  const typeLabelId = useId();

  const saved: TxDraft = useMemo(
    () => ({
      default_transaction_type: prefs.default_transaction_type,
      default_expense_account_id: prefs.default_expense_account_id,
      default_expense_category_id: prefs.default_expense_category_id,
      default_income_account_id: prefs.default_income_account_id,
      default_income_category_id: prefs.default_income_category_id,
      default_transfer_from_account_id: prefs.default_transfer_from_account_id,
      default_transfer_to_account_id: prefs.default_transfer_to_account_id,
      remember_last_account: prefs.remember_last_account,
      confirm_before_delete: prefs.confirm_before_delete,
    }),
    [prefs],
  );
  const [draft, setDraft] = useState<TxDraft>(saved);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<FinancialContainer[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => setDraft(saved), [saved]);

  useEffect(() => {
    let active = true;
    Promise.all([listAccounts(), listCategories()])
      .then(([accountRows, categoryRows]) => {
        if (!active) return;
        setAccounts(accountRows);
        setCategories(categoryRows);
      })
      .catch((err) => {
        if (!active) return;
        setAccounts([]);
        setCategories([]);
        setLoadError(getErrorMessage(err, "Could not load accounts and categories."));
      });
    return () => {
      active = false;
    };
  }, []);

  const dirty = (Object.keys(saved) as Array<keyof TxDraft>).some(
    (key) => saved[key] !== draft[key],
  );
  useReportDirty("transactions", dirty);

  const accountOptions: SearchOption[] = useMemo(() => {
    const rows = (accounts ?? []).map((account) => ({
      value: account.id,
      label: account.name,
      hint: `${account.currency} · ${getContainerMeta(account.type).label}`,
    }));
    return [{ value: NONE, label: "No default" }, ...rows];
  }, [accounts]);

  const categoryOptions: SearchOption[] = useMemo(() => {
    const rows = (categories ?? [])
      .map((category) => ({ value: category.id, label: category.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: NONE, label: "No default" }, ...rows];
  }, [categories]);

  function isMissing(kind: "account" | "category", id: string | null) {
    if (!id) return false;
    const rows: Array<{ id: string }> | null =
      kind === "account" ? accounts : categories;
    return Boolean(rows && !rows.some((row) => row.id === id));
  }

  async function onSave() {
    setSaving(true);
    try {
      // Keep the legacy single defaults in step for older app versions.
      const type = draft.default_transaction_type;
      const { queued } = await save({
        ...draft,
        default_account_id:
          type === "income"
            ? draft.default_income_account_id
            : type === "transfer"
              ? draft.default_transfer_from_account_id
              : draft.default_expense_account_id,
        default_category_id:
          type === "income"
            ? draft.default_income_category_id
            : type === "expense"
              ? draft.default_expense_category_id
              : null,
      });
      showToast({
        title: queued ? "Saved on this device" : "Transaction defaults saved",
        description: queued
          ? "They'll sync to your account when you're back online."
          : "New transactions will start with these values.",
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Could not save defaults",
        description: getErrorMessage(err),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  const loading = accounts === null || categories === null;

  return (
    <div className="space-y-4">
      {loadError ? (
        <Alert tone="warning" title="Lists unavailable" description={loadError} />
      ) : null}
      <SettingsGroup
        title="New transaction"
        description="What “New transaction” starts with. Receipt scans and quick actions can still override these."
      >
        {loading ? (
          <SectionLoading rows={2} />
        ) : (
          <>
            <SettingRow
              label="Opens as"
              labelId={typeLabelId}
              description="Changing the type in the form switches to that type's own defaults below."
            >
              <Segmented
                ariaLabelledBy={typeLabelId}
                value={draft.default_transaction_type}
                options={TYPE_OPTIONS}
                disabled={!canUpdate}
                onChange={(value) =>
                  setDraft((d) => ({ ...d, default_transaction_type: value }))
                }
              />
            </SettingRow>
            <SwitchRow
              id="settings-remember-account"
              label="Remember last used account"
              description="Expenses and transfers start from the account you last paid from instead of the default."
              checked={draft.remember_last_account}
              disabled={!canUpdate}
              onChange={(checked) =>
                setDraft((d) => ({ ...d, remember_last_account: checked }))
              }
            />
          </>
        )}
      </SettingsGroup>

      {TYPE_GROUPS.map((group) => (
        <SettingsGroup
          key={group.type}
          title={group.title}
          description={group.description}
        >
          {loading ? (
            <SectionLoading rows={2} />
          ) : (
            group.fields.map((field) => {
              const value = draft[field.key];
              const labelId = `${labelPrefix}-${field.key}`;
              return (
                <SettingRow
                  key={field.key}
                  label={field.label}
                  labelId={labelId}
                  description={
                    isMissing(field.kind, value)
                      ? `That ${field.kind} no longer exists — pick another.`
                      : undefined
                  }
                >
                  <SearchSelect
                    ariaLabelledBy={labelId}
                    value={value || NONE}
                    options={
                      field.kind === "account" ? accountOptions : categoryOptions
                    }
                    disabled={!canUpdate}
                    searchPlaceholder={
                      field.kind === "account"
                        ? "Search accounts"
                        : "Search categories"
                    }
                    onChange={(next) =>
                      setDraft((d) => ({
                        ...d,
                        [field.key]: next === NONE ? null : next,
                      }))
                    }
                  />
                </SettingRow>
              );
            })
          )}
        </SettingsGroup>
      ))}

      <SettingsGroup title="Safety">
        <SwitchRow
          id="settings-confirm-delete"
          label="Confirm before deleting"
          description="Ask before a transaction is deleted. Deleting reverses its effect on account balances."
          checked={draft.confirm_before_delete}
          disabled={!canUpdate}
          onChange={(checked) =>
            setDraft((d) => ({ ...d, confirm_before_delete: checked }))
          }
        />
      </SettingsGroup>

      <SaveBar
        dirty={dirty}
        saving={saving}
        disabled={!canUpdate}
        onSave={() => void onSave()}
        onDiscard={() => setDraft(saved)}
      />
    </div>
  );
}
