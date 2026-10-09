"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/client";
import {
  getReportSchedule,
  saveReportSchedule,
  sendReportNow,
  type ReportSchedule,
} from "@/lib/api/reports";
import { APP_NAME } from "@/lib/brand";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  SectionLoading,
  Segmented,
  SettingRow,
  SettingsGroup,
  SwitchRow,
} from "./settings-ui";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const EMPTY: ReportSchedule = {
  enabled: true,
  frequency: "weekly",
  weekday: 6,
  monthly_mode: "last_day",
  day_of_month: 1,
  custom_mode: "interval",
  interval_days: 14,
  custom_dates: [],
  send_time: "10:00",
  include_excel: true,
  include_ai: true,
};

export function ReportScheduleSection({ canUpdate }: { canUpdate: boolean }) {
  const { showToast } = useToast();
  const [form, setForm] = useState<ReportSchedule>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [dateToAdd, setDateToAdd] = useState("");

  useEffect(() => {
    let active = true;
    void getReportSchedule()
      .then((data) => {
        if (active) setForm({ ...EMPTY, ...data });
      })
      .catch((err) => {
        showToast({
          title: "Could not load report schedule",
          description: getErrorMessage(err),
          tone: "error",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  function patch(partial: Partial<ReportSchedule>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveReportSchedule({
        enabled: form.enabled,
        frequency: form.frequency,
        weekday: form.weekday,
        monthly_mode: form.monthly_mode,
        day_of_month: form.day_of_month,
        custom_mode: form.custom_mode,
        interval_days: form.interval_days,
        custom_dates: form.custom_dates,
        send_time: form.send_time,
        include_excel: form.include_excel,
        include_ai: form.include_ai,
      });
      setForm({ ...EMPTY, ...saved });
      showToast({
        title: "Report schedule saved",
        description: saved.summary || "Email cadence updated.",
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Could not save schedule",
        description: getErrorMessage(err),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onSendNow() {
    setSending(true);
    try {
      const result = await sendReportNow();
      const saved = await getReportSchedule().catch(() => null);
      if (saved) setForm({ ...EMPTY, ...saved });
      showToast({
        title: "Report emailed",
        description: `Covering ${result.period.start} to ${result.period.end}. Check your inbox.`,
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Could not send report",
        description: getErrorMessage(err),
        tone: "error",
      });
    } finally {
      setSending(false);
    }
  }

  function addDate() {
    const value = dateToAdd.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    if (form.custom_dates.includes(value)) return;
    patch({ custom_dates: [...form.custom_dates, value].sort() });
    setDateToAdd("");
  }

  if (loading) {
    return (
      <SettingsGroup title="Emailed financial reports">
        <SectionLoading rows={3} />
      </SettingsGroup>
    );
  }

  // next_send_at may be a zone-less wall time in the report timezone.
  const nextSend = form.next_send_at
    ? /(Z|[+-]\d{2}:?\d{2})$/.test(form.next_send_at)
      ? formatDateTime(form.next_send_at)
      : `${formatDate(form.next_send_at.slice(0, 10))} ${form.next_send_at.slice(11, 16)}`.trim()
    : null;

  return (
    <form onSubmit={onSave} className="space-y-4">
      <SettingsGroup
        title="Emailed financial reports"
        description={
          form.default_note ||
          `If you never change this, ${APP_NAME} emails a report every Saturday at 10:00 in your timezone.`
        }
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={sending}
            disabled={!canUpdate}
            onClick={() => void onSendNow()}
          >
            Email a report now
          </Button>
        }
      >
        <SwitchRow
          id="report-enabled"
          label="Send reports automatically"
          description={form.summary || "Weekly on Saturday at 10:00"}
          checked={form.enabled}
          disabled={!canUpdate}
          onChange={(checked) => patch({ enabled: checked })}
        />
        <SettingRow label="How often" labelId="report-frequency-label">
          <Segmented
            ariaLabelledBy="report-frequency-label"
            value={form.frequency}
            disabled={!canUpdate || !form.enabled}
            options={[
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
              { value: "custom", label: "Custom" },
            ]}
            onChange={(frequency) => patch({ frequency })}
          />
        </SettingRow>

        {form.frequency === "weekly" ? (
          <SettingRow label="Day of the week" htmlFor="report-weekday">
            <Select
              id="report-weekday"
              value={String(form.weekday)}
              disabled={!canUpdate || !form.enabled}
              onChange={(e) => patch({ weekday: Number(e.target.value) })}
            >
              {WEEKDAYS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </Select>
          </SettingRow>
        ) : null}

        {form.frequency === "monthly" ? (
          <>
            <SettingRow label="Send on" labelId="report-monthly-mode-label">
              <Segmented
                ariaLabelledBy="report-monthly-mode-label"
                value={form.monthly_mode}
                disabled={!canUpdate || !form.enabled}
                options={[
                  { value: "last_day", label: "Last day" },
                  { value: "day_of_month", label: "Specific day" },
                ]}
                onChange={(monthly_mode) => patch({ monthly_mode })}
              />
            </SettingRow>
            {form.monthly_mode === "day_of_month" ? (
              <SettingRow
                label="Day of month"
                htmlFor="report-dom"
                description="Days 29–31 aren't offered so every month gets a report."
              >
                <Select
                  id="report-dom"
                  value={String(form.day_of_month)}
                  disabled={!canUpdate || !form.enabled}
                  onChange={(e) =>
                    patch({ day_of_month: Number(e.target.value) })
                  }
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {String(day)}
                    </option>
                  ))}
                </Select>
              </SettingRow>
            ) : null}
          </>
        ) : null}

        {form.frequency === "custom" ? (
          <>
            <SettingRow label="Custom schedule" labelId="report-custom-mode-label">
              <Segmented
                ariaLabelledBy="report-custom-mode-label"
                value={form.custom_mode}
                disabled={!canUpdate || !form.enabled}
                options={[
                  { value: "interval", label: "Every N days" },
                  { value: "dates", label: "Specific dates" },
                ]}
                onChange={(custom_mode) => patch({ custom_mode })}
              />
            </SettingRow>
            {form.custom_mode === "interval" ? (
              <SettingRow label="Days between reports" htmlFor="report-interval">
                <Input
                  id="report-interval"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={365}
                  value={form.interval_days}
                  disabled={!canUpdate || !form.enabled}
                  onChange={(e) =>
                    patch({ interval_days: Number(e.target.value) || 1 })
                  }
                />
              </SettingRow>
            ) : (
              <SettingRow
                label="Send dates"
                htmlFor="report-add-date"
                description={
                  form.custom_dates.length
                    ? undefined
                    : "Add at least one date, or no report is sent."
                }
                stacked
              >
                <div className="flex gap-2">
                  <Input
                    id="report-add-date"
                    type="date"
                    value={dateToAdd}
                    disabled={!canUpdate || !form.enabled}
                    onChange={(e) => setDateToAdd(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 shrink-0 sm:h-11"
                    disabled={!canUpdate || !dateToAdd}
                    onClick={addDate}
                  >
                    Add
                  </Button>
                </div>
                {form.custom_dates.length ? (
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {form.custom_dates.map((date) => (
                      <li
                        key={date}
                        className="flex items-center gap-1 rounded-full bg-[var(--ds-background-100)] py-0.5 pr-0.5 pl-3 text-[12px] tabular-nums ds-border"
                      >
                        {formatDate(date)}
                        <button
                          type="button"
                          aria-label={`Remove ${formatDate(date)}`}
                          className="flex size-8 items-center justify-center rounded-full text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] ds-focus"
                          disabled={!canUpdate}
                          onClick={() =>
                            patch({
                              custom_dates: form.custom_dates.filter(
                                (item) => item !== date,
                              ),
                            })
                          }
                        >
                          <X size={13} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </SettingRow>
            )}
          </>
        ) : null}

        <SettingRow
          label="Send time"
          htmlFor="report-time"
          description={form.timezone ? `In ${form.timezone}.` : undefined}
        >
          <Input
            id="report-time"
            type="time"
            value={form.send_time}
            disabled={!canUpdate || !form.enabled}
            onChange={(e) => patch({ send_time: e.target.value })}
          />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="What's included">
        <SwitchRow
          id="report-excel"
          label="Attach Excel workbook"
          description="Charts, transactions, budgets, accounts, goals, loans and investments."
          checked={form.include_excel}
          disabled={!canUpdate}
          onChange={(checked) => patch({ include_excel: checked })}
        />
        <SwitchRow
          id="report-ai"
          label="Include AI coaching"
          description={`Uses your connected AI provider. If it's unavailable, ${APP_NAME} still writes number-based recommendations.`}
          checked={form.include_ai}
          disabled={!canUpdate}
          onChange={(checked) => patch({ include_ai: checked })}
        />
        {nextSend || form.last_error ? (
          <div className="space-y-1 py-3">
            {nextSend ? (
              <p className="text-[12px] text-[var(--ds-gray-700)]">
                Next report:{" "}
                <span className="font-medium text-[var(--ds-gray-1000)] tabular-nums">
                  {nextSend}
                </span>
              </p>
            ) : null}
            {form.last_error ? (
              <p role="alert" className="text-[12px] text-[var(--ds-status-red)]">
                Last send failed: {form.last_error}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex justify-end py-3">
          <Button type="submit" loading={saving} disabled={!canUpdate}>
            Save schedule
          </Button>
        </div>
      </SettingsGroup>
    </form>
  );
}
