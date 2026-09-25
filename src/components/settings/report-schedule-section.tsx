"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <Card>
        <CardBody>
          <p className="text-sm text-[var(--ds-gray-900)]">
            Loading report schedule…
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-semibold">
          Email financial reports
        </h2>
        <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
          {form.default_note ||
            `If you never change this, ${APP_NAME} emails a report every Saturday at 10:00 in your timezone.`}
        </p>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSave} className="space-y-4">
          <Checkbox
            id="report-enabled"
            checked={form.enabled}
            onChange={(checked) => patch({ enabled: checked })}
            disabled={!canUpdate}
            label="Send reports automatically"
            description={form.summary || "Weekly on Saturday at 10:00"}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="report-frequency">Frequency</Label>
              <Select
                id="report-frequency"
                value={form.frequency}
                disabled={!canUpdate}
                onChange={(e) =>
                  patch({
                    frequency: e.target.value as ReportSchedule["frequency"],
                  })
                }
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="report-time">Send time</Label>
              <Input
                id="report-time"
                type="time"
                value={form.send_time}
                disabled={!canUpdate}
                onChange={(e) => patch({ send_time: e.target.value })}
              />
            </div>
          </div>

          {form.frequency === "weekly" ? (
            <div>
              <Label htmlFor="report-weekday">Weekday</Label>
              <Select
                id="report-weekday"
                value={String(form.weekday)}
                disabled={!canUpdate}
                onChange={(e) => patch({ weekday: Number(e.target.value) })}
              >
                {WEEKDAYS.map((label, index) => (
                  <option key={label} value={index}>
                    {index}. {label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {form.frequency === "monthly" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="report-monthly-mode">Send on</Label>
                <Select
                  id="report-monthly-mode"
                  value={form.monthly_mode}
                  disabled={!canUpdate}
                  onChange={(e) =>
                    patch({
                      monthly_mode: e.target
                        .value as ReportSchedule["monthly_mode"],
                    })
                  }
                >
                  <option value="last_day">Last day of the month</option>
                  <option value="day_of_month">A specific day</option>
                </Select>
              </div>
              {form.monthly_mode === "day_of_month" ? (
                <div>
                  <Label htmlFor="report-dom">Day of month</Label>
                  <Select
                    id="report-dom"
                    value={String(form.day_of_month)}
                    disabled={!canUpdate}
                    onChange={(e) =>
                      patch({ day_of_month: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
            </div>
          ) : null}

          {form.frequency === "custom" ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="report-custom-mode">Custom type</Label>
                <Select
                  id="report-custom-mode"
                  value={form.custom_mode}
                  disabled={!canUpdate}
                  onChange={(e) =>
                    patch({
                      custom_mode: e.target.value as ReportSchedule["custom_mode"],
                    })
                  }
                >
                  <option value="interval">Every N days</option>
                  <option value="dates">Specific dates</option>
                </Select>
              </div>
              {form.custom_mode === "interval" ? (
                <div>
                  <Label htmlFor="report-interval">Days between reports</Label>
                  <Input
                    id="report-interval"
                    type="number"
                    min={1}
                    max={365}
                    value={form.interval_days}
                    disabled={!canUpdate}
                    onChange={(e) =>
                      patch({ interval_days: Number(e.target.value) || 1 })
                    }
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="report-add-date">Add a send date</Label>
                  <div className="flex gap-2">
                    <Input
                      id="report-add-date"
                      type="date"
                      value={dateToAdd}
                      disabled={!canUpdate}
                      onChange={(e) => setDateToAdd(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!canUpdate || !dateToAdd}
                      onClick={addDate}
                    >
                      Add
                    </Button>
                  </div>
                  {form.custom_dates.length ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {form.custom_dates.map((date) => (
                        <li
                          key={date}
                          className="flex items-center gap-1 rounded-full bg-[var(--ds-background-100)] px-2.5 py-1 text-[12px] ds-border"
                        >
                          {date}
                          <button
                            type="button"
                            className="text-[var(--ds-gray-700)]"
                            disabled={!canUpdate}
                            onClick={() =>
                              patch({
                                custom_dates: form.custom_dates.filter(
                                  (item) => item !== date,
                                ),
                              })
                            }
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[var(--ds-gray-700)]">
                      Add at least one date or reports will not send on a custom
                      calendar.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : null}

          <Checkbox
            id="report-excel"
            checked={form.include_excel}
            onChange={(checked) => patch({ include_excel: checked })}
            disabled={!canUpdate}
            label="Attach Excel workbook"
            description="Includes data-bar charts, transactions, budgets, accounts, goals, loans, and investments."
          />
          <Checkbox
            id="report-ai"
            checked={form.include_ai}
            onChange={(checked) => patch({ include_ai: checked })}
            disabled={!canUpdate}
            label="Include AI coaching"
            description="Uses your connected AI provider. If it is unavailable, Opal still writes number-based recommendations."
          />

          {form.next_send_at ? (
            <p className="text-xs text-[var(--ds-gray-700)]">
              Next send: {form.next_send_at.replace("T", " ")}
              {form.timezone ? ` · ${form.timezone}` : ""}
            </p>
          ) : null}
          {form.last_error ? (
            <p className="text-xs text-[var(--ds-status-red)]">
              Last send error: {form.last_error}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              loading={sending}
              disabled={!canUpdate}
              onClick={() => void onSendNow()}
            >
              Email report now
            </Button>
            <Button type="submit" loading={saving} disabled={!canUpdate}>
              Save schedule
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
