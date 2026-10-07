"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/api/client";
import { updateProfile } from "@/lib/api/user";
import {
  COUNTRIES,
  SUPPORTED_CURRENCIES,
  getCountry,
} from "@/lib/currency/currency.data";
import {
  configureFormatting,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatDateTime,
  getFormatSettings,
  orderedWeekdays,
  todayISO,
} from "@/lib/format";
import { useAppDispatch } from "@/lib/store/hooks";
import { hydratePreferences } from "@/lib/preferences/slice";
import { setPendingPreferences } from "@/lib/preferences/storage";
import {
  DATE_FORMAT_OPTIONS,
  NUMBER_FORMAT_OPTIONS,
  WEEK_START_OPTIONS,
  normalizePreferences,
  type DateFormat,
  type NumberFormat,
  type WeekStart,
} from "@/lib/preferences/types";
import {
  LOCALE_OPTIONS,
  currencyName,
  detectTimeZone,
  suggestLocaleForCountry,
  timeZoneOptions,
} from "@/lib/preferences/regional";
import { usePreferences } from "@/lib/preferences/use-preferences";
import {
  SaveBar,
  SearchSelect,
  Segmented,
  SettingRow,
  SettingsGroup,
  useReportDirty,
  type SearchOption,
} from "./settings-ui";

type RegionalDraft = {
  country: string;
  currency: string;
  timezone: string;
  locale: string;
  date_format: DateFormat;
  number_format: NumberFormat;
  week_start: WeekStart;
};

function sameDraft(a: RegionalDraft, b: RegionalDraft) {
  return (Object.keys(a) as Array<keyof RegionalDraft>).every(
    (key) => a[key] === b[key],
  );
}

/** Render sample values with a draft formatting context, then restore. */
function usePreview(draft: RegionalDraft) {
  return useMemo(() => {
    const previous = getFormatSettings();
    configureFormatting({
      locale: draft.locale,
      timeZone: draft.timezone,
      dateFormat: draft.date_format,
      numberFormat: draft.number_format,
      weekStart: draft.week_start,
    });
    try {
      return {
        amount: formatCurrency(1234567.89, draft.currency),
        negative: formatCurrency(-12450, draft.currency),
        compact: formatCompactCurrency(2450000, draft.currency),
        date: formatDate(todayISO()),
        dateTime: formatDateTime(new Date()),
        week: orderedWeekdays(draft.week_start, "short"),
      };
    } finally {
      configureFormatting(previous);
    }
  }, [draft]);
}

export function RegionalSection({ canUpdate }: { canUpdate: boolean }) {
  const { user, setSession } = useAuth();
  const { prefs } = usePreferences();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const ids = {
    country: useId(),
    currency: useId(),
    timezone: useId(),
    locale: useId(),
    week: useId(),
  };

  const saved: RegionalDraft = useMemo(
    () => ({
      country: user?.country || "US",
      currency: user?.currency || "USD",
      timezone: user?.timezone || "UTC",
      locale: user?.locale || "en-US",
      date_format: prefs.date_format,
      number_format: prefs.number_format,
      week_start: prefs.week_start,
    }),
    [
      user?.country,
      user?.currency,
      user?.timezone,
      user?.locale,
      prefs.date_format,
      prefs.number_format,
      prefs.week_start,
    ],
  );
  const [draft, setDraft] = useState<RegionalDraft>(saved);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(saved), [saved]);

  const dirty = !sameDraft(draft, saved);
  useReportDirty("regional", dirty);
  const preview = usePreview(draft);

  const deviceZone = useMemo(() => detectTimeZone(), []);
  const countryOptions: SearchOption[] = useMemo(
    () =>
      [...COUNTRIES]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.code, label: c.name, hint: c.code })),
    [],
  );
  const currencyOptions: SearchOption[] = useMemo(
    () =>
      SUPPORTED_CURRENCIES.map((code) => ({
        value: code,
        label: `${code} — ${currencyName(code)}`,
      })),
    [],
  );
  const zoneOptions = useMemo(() => {
    const all = timeZoneOptions();
    // Keep a stored zone selectable even if this engine doesn't list it.
    return all.some((o) => o.value === draft.timezone)
      ? all
      : [{ value: draft.timezone, label: draft.timezone }, ...all];
  }, [draft.timezone]);
  const localeOptions: SearchOption[] = useMemo(() => {
    const base = LOCALE_OPTIONS.map((o) => ({ value: o.value, label: o.label, hint: o.value }));
    return base.some((o) => o.value === draft.locale)
      ? base
      : [{ value: draft.locale, label: draft.locale }, ...base];
  }, [draft.locale]);

  function patch(next: Partial<RegionalDraft>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  function onCountry(code: string) {
    const meta = getCountry(code);
    const locale = suggestLocaleForCountry(code);
    patch({
      country: code,
      ...(meta ? { currency: meta.currency } : {}),
      ...(locale ? { locale } : {}),
      ...(code === "IN" ? { number_format: "indian" as NumberFormat } : {}),
    });
  }

  async function onSave() {
    if (!user) return;
    setSaving(true);
    try {
      const nextPrefs = normalizePreferences({
        ...prefs,
        date_format: draft.date_format,
        number_format: draft.number_format,
        week_start: draft.week_start,
      });
      // One request: profile columns + preferences (queued offline if needed).
      const updated = await updateProfile({
        country: draft.country,
        currency: draft.currency,
        timezone: draft.timezone,
        locale: draft.locale,
        preferences: nextPrefs,
      });
      const queued = Boolean((updated as { _pending?: boolean })._pending);
      setPendingPreferences(queued);
      dispatch(hydratePreferences(nextPrefs));
      await setSession({
        ...user,
        ...updated,
        id: user.id,
        email: updated.email || user.email,
      });
      showToast({
        title: queued ? "Saved on this device" : "Regional settings saved",
        description: queued
          ? "They'll sync to your account when you're back online."
          : "Amounts and dates across Opal now use these formats.",
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Could not save regional settings",
        description: getErrorMessage(err),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  const zoneMismatch =
    deviceZone && draft.timezone !== deviceZone ? deviceZone : null;

  return (
    <div className="space-y-4">
      <div
        aria-label="Formatting preview"
        className="grid gap-3 rounded-[14px] bg-[var(--ds-background-elevated)] p-4 ds-border sm:grid-cols-3 sm:p-5"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--ds-gray-700)] uppercase">
            Amount
          </p>
          <p className="mt-1 truncate font-heading text-[20px] font-semibold tabular-nums text-[var(--ds-gray-1000)]">
            {preview.amount}
          </p>
          <p className="mt-0.5 truncate text-[12px] tabular-nums text-[var(--ds-gray-700)]">
            {preview.negative} · {preview.compact}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--ds-gray-700)] uppercase">
            Date
          </p>
          <p className="mt-1 truncate font-heading text-[20px] font-semibold tabular-nums text-[var(--ds-gray-1000)]">
            {preview.date}
          </p>
          <p className="mt-0.5 truncate text-[12px] tabular-nums text-[var(--ds-gray-700)]">
            {preview.dateTime}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--ds-gray-700)] uppercase">
            Week
          </p>
          <div className="mt-2 flex gap-1" aria-label="Week starts on">
            {preview.week.map((day, index) => (
              <span
                key={`${day}-${index}`}
                className={
                  index === 0
                    ? "flex h-7 min-w-0 flex-1 items-center justify-center rounded-[6px] bg-[var(--ds-focus-color)] text-[10.5px] font-semibold text-white"
                    : "flex h-7 min-w-0 flex-1 items-center justify-center rounded-[6px] bg-[var(--ds-background-200)] text-[10.5px] text-[var(--ds-gray-900)]"
                }
              >
                {day.slice(0, 2)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <SettingsGroup
        title="Region & currency"
        description="Your base currency is used for totals, budgets and net worth. Each account keeps its own currency."
      >
        <SettingRow label="Country" labelId={ids.country} description="Changing it suggests a currency and language.">
          <SearchSelect
            ariaLabelledBy={ids.country}
            value={draft.country}
            options={countryOptions}
            onChange={onCountry}
            searchPlaceholder="Search countries"
            disabled={!canUpdate}
          />
        </SettingRow>
        <SettingRow label="Base currency" labelId={ids.currency}>
          <SearchSelect
            ariaLabelledBy={ids.currency}
            value={draft.currency}
            options={currencyOptions}
            onChange={(currency) => patch({ currency })}
            searchPlaceholder="Search currencies"
            disabled={!canUpdate}
          />
        </SettingRow>
        <SettingRow
          label="Timezone"
          labelId={ids.timezone}
          description={
            zoneMismatch ? (
              <>
                This device is on{" "}
                <span className="font-medium text-[var(--ds-gray-900)]">
                  {zoneMismatch.replace(/_/g, " ")}
                </span>
                . Timestamps and emailed reports use the zone you pick.
              </>
            ) : (
              "Used for timestamps and when scheduled reports are sent."
            )
          }
        >
          <div className="flex min-w-0 gap-2">
            <div className="min-w-0 flex-1">
              <SearchSelect
                ariaLabelledBy={ids.timezone}
                value={draft.timezone}
                options={zoneOptions}
                onChange={(timezone) => patch({ timezone })}
                searchPlaceholder="Search city or region"
                disabled={!canUpdate}
              />
            </div>
            <Button
              variant="secondary"
              className="h-11 shrink-0 px-3"
              disabled={!canUpdate || !deviceZone || draft.timezone === deviceZone}
              onClick={() => deviceZone && patch({ timezone: deviceZone })}
              aria-label="Use this device's timezone"
              title="Use this device's timezone"
            >
              <LocateFixed size={15} aria-hidden />
              <span className="hidden sm:inline">Detect</span>
            </Button>
          </div>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup
        title="Formats"
        description="How numbers, dates and weeks appear everywhere in Opal."
      >
        <SettingRow
          label="Language & region format"
          labelId={ids.locale}
          description="Month names and where the currency symbol goes."
        >
          <SearchSelect
            ariaLabelledBy={ids.locale}
            value={draft.locale}
            options={localeOptions}
            onChange={(locale) => patch({ locale })}
            searchPlaceholder="Search languages"
            disabled={!canUpdate}
          />
        </SettingRow>
        <SettingRow
          label="Number format"
          labelId="settings-number-format"
          description="Indian format groups by lakh and crore (12,34,567)."
          stacked
        >
          <div
            role="radiogroup"
            aria-labelledby="settings-number-format"
            className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-3"
          >
            {NUMBER_FORMAT_OPTIONS.map((option) => {
              const active = draft.number_format === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!canUpdate}
                  onClick={() => patch({ number_format: option.value })}
                  className={
                    active
                      ? "flex min-h-12 flex-col items-start justify-center rounded-[10px] px-3 py-2 text-left ring-2 ring-[var(--ds-focus-color)] ds-focus"
                      : "flex min-h-12 flex-col items-start justify-center rounded-[10px] px-3 py-2 text-left ds-border hover:bg-[var(--ds-gray-100)] ds-focus disabled:opacity-45"
                  }
                >
                  <span className="text-[13px] font-medium text-[var(--ds-gray-1000)]">
                    {option.value === "auto" ? option.label : option.example}
                  </span>
                  <span className="text-[11.5px] text-[var(--ds-gray-700)]">
                    {option.value === "auto"
                      ? `Follows ${draft.locale}`
                      : option.value === "indian"
                        ? "Indian (lakh, crore)"
                        : option.value === "comma_dot"
                          ? "Comma groups, dot decimal"
                          : option.value === "dot_comma"
                            ? "Dot groups, comma decimal"
                            : "Space groups, comma decimal"}
                  </span>
                </button>
              );
            })}
          </div>
        </SettingRow>
        <SettingRow
          label="Date format"
          labelId="settings-date-format"
          description={`Today: ${preview.date}`}
          stacked
        >
          <div
            role="radiogroup"
            aria-labelledby="settings-date-format"
            className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-3"
          >
            {DATE_FORMAT_OPTIONS.map((option) => {
              const active = draft.date_format === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!canUpdate}
                  onClick={() => patch({ date_format: option.value })}
                  className={
                    active
                      ? "flex min-h-11 items-center rounded-[10px] px-3 text-left text-[13px] font-medium text-[var(--ds-gray-1000)] ring-2 ring-[var(--ds-focus-color)] ds-focus"
                      : "flex min-h-11 items-center rounded-[10px] px-3 text-left text-[13px] text-[var(--ds-gray-900)] ds-border hover:bg-[var(--ds-gray-100)] ds-focus disabled:opacity-45"
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </SettingRow>
        <SettingRow
          label="First day of week"
          labelId={ids.week}
          description="Used by weekly charts and calendars."
        >
          <Segmented
            ariaLabelledBy={ids.week}
            value={draft.week_start}
            options={WEEK_START_OPTIONS}
            onChange={(week_start) => patch({ week_start })}
            disabled={!canUpdate}
          />
        </SettingRow>
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
