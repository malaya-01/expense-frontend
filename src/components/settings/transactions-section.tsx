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
  | "default_account_id"
  | "default_category_id"
  | "default_transaction_type"
  | "remember_last_account"
  | "confirm_before_delete"
>;

const NONE = "__none__";

const TYPE_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

export function TransactionsSection({ canUpdate }: { canUpdate: boolean }) {
  const { prefs, save } = usePreferences();
  const { showToast } = useToast();
  const accountLabelId = useId();
  const categoryLabelId = useId();
  const typeLabelId = useId();

  const saved: TxDraft = useMemo(
    () => ({
      default_account_id: prefs.default_account_id,
      default_category_id: prefs.default_category_id,
      default_transaction_type: prefs.default_transaction_type,
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

  const missingAccount =
    accounts &&
    draft.default_account_id &&
    !accounts.some((a) => a.id === draft.default_account_id);

  async function onSave() {
    setSaving(true);
    try {
      const { queued } = await save(draft);
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
        title="New transaction defaults"
        description="Pre-filled every time you open “New transaction”. Receipt scans and quick actions can still override them."
      >
        {loading ? (
          <SectionLoading rows={3} />
        ) : (
          <>
            <SettingRow label="Type" labelId={typeLabelId}>
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
            <SettingRow
              label="Default account"
              labelId={accountLabelId}
              description={
                missingAccount
                  ? "That account no longer exists — pick another."
                  : "Where money leaves (expense, transfer) or arrives (income)."
              }
            >
              <SearchSelect
                ariaLabelledBy={accountLabelId}
                value={draft.default_account_id || NONE}
                options={accountOptions}
                disabled={!canUpdate}
                searchPlaceholder="Search accounts"
                onChange={(value) =>
                  setDraft((d) => ({
                    ...d,
                    default_account_id: value === NONE ? null : value,
                  }))
                }
              />
            </SettingRow>
            <SettingRow
              label="Default category"
              labelId={categoryLabelId}
              description={`Applied to new ${draft.default_transaction_type} transactions.`}
            >
              <SearchSelect
                ariaLabelledBy={categoryLabelId}
                value={draft.default_category_id || NONE}
                options={categoryOptions}
                disabled={!canUpdate}
                searchPlaceholder="Search categories"
                onChange={(value) =>
                  setDraft((d) => ({
                    ...d,
                    default_category_id: value === NONE ? null : value,
                  }))
                }
              />
            </SettingRow>
            <SwitchRow
              id="settings-remember-account"
              label="Remember last used account"
              description="Start with the account you used last time instead of the default account."
              checked={draft.remember_last_account}
              disabled={!canUpdate}
              onChange={(checked) =>
                setDraft((d) => ({ ...d, remember_last_account: checked }))
              }
            />
          </>
        )}
      </SettingsGroup>

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
