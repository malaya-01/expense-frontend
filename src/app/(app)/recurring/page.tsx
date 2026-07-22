"use client";

import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CalendarClock, Pause, Play, Plus, Zap } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, Badge, CardGridSkeleton } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { listAccounts } from "@/lib/api/accounts";
import { listCategories } from "@/lib/api/categories";
import {
  archiveRecurringSchedule,
  createRecurringSchedule,
  executeRecurringSchedule,
  listRecurringSchedules,
  updateRecurringSchedule,
} from "@/lib/api/recurring";
import { getErrorMessage } from "@/lib/api/client";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import type {
  Category,
  CreateRecurringScheduleInput,
  FinancialContainer,
  RecurringSchedule,
  TransactionType,
} from "@/types";

const EMPTY: CreateRecurringScheduleInput = {
  name: "",
  transaction_type: "expense",
  amount: 0,
  description: "",
  category_id: "",
  source_container_id: "",
  destination_container_id: "",
  frequency: "monthly",
  start_date: todayISO(),
  end_date: "",
  execution_mode: "review",
  notes: "",
};

const FREQUENCIES: Array<[RecurringSchedule["frequency"], string]> = [
  ["daily", "Daily"],
  ["weekly", "Weekly"],
  ["biweekly", "Every two weeks"],
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
  ["semiannual", "Every six months"],
  ["annual", "Annually"],
];

export default function RecurringPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [accounts, setAccounts] = useState<FinancialContainer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateRecurringScheduleInput>(EMPTY);
  const [archiveTarget, setArchiveTarget] =
    useState<RecurringSchedule | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const [scheduleRows, accountRows, categoryRows] = await Promise.all([
        listRecurringSchedules(),
        listAccounts(user.id),
        listCategories(),
      ]);
      setSchedules(scheduleRows);
      setAccounts(accountRows);
      setCategories(categoryRows);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load recurring schedules"));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const metrics = useMemo(() => {
    const active = schedules.filter((schedule) => schedule.status === "active");
    return {
      active: active.length,
      automatic: active.filter(
        (schedule) => schedule.execution_mode === "automatic",
      ).length,
      due: active.filter((schedule) => schedule.next_execution <= todayISO())
        .length,
    };
  }, [schedules]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createRecurringSchedule({
        ...form,
        category_id: form.category_id || undefined,
        source_container_id: form.source_container_id || undefined,
        destination_container_id: form.destination_container_id || undefined,
        end_date: form.end_date || undefined,
      });
      setOpen(false);
      showToast({
        title: "Recurring schedule created",
        description:
          form.execution_mode === "automatic"
            ? "Due entries will post automatically through the ledger."
            : "Due entries will wait for your review.",
        tone: "success",
      });
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not create schedule"));
    } finally {
      setSaving(false);
    }
  }

  function setType(type: TransactionType) {
    setForm((current) => ({
      ...current,
      transaction_type: type,
      source_container_id: type === "income" ? "" : current.source_container_id,
      destination_container_id:
        type === "expense" ? "" : current.destination_container_id,
    }));
  }

  return (
    <div>
      <PageHeader
        title="Recurring transactions"
        description="Automate predictable money movement while keeping every execution traceable and reversible."
        actions={
          <Button
            onClick={() => {
              setForm({ ...EMPTY, start_date: todayISO() });
              setOpen(true);
            }}
          >
            <Plus size={15} />
            New schedule
          </Button>
        }
      />

      {error ? (
        <Alert
          className="mb-5"
          tone="error"
          title="Automation needs attention"
          description={error}
          actionLabel="Retry"
          onAction={() => void refresh()}
        />
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Active schedules" value={String(metrics.active)} />
        <Metric label="Automatic" value={String(metrics.automatic)} />
        <Metric label="Due for posting" value={String(metrics.due)} />
      </div>

      {loading ? (
        <CardGridSkeleton />
      ) : schedules.length === 0 ? (
        <Card>
          <EmptyState
            title="No recurring schedules"
            description="Automate salary, rent, subscriptions, savings transfers, EMIs, and other predictable events."
            actionLabel="Create schedule"
            onAction={() => setOpen(true)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
          {schedules.map((schedule) => {
            const due =
              schedule.status === "active" &&
              schedule.next_execution <= todayISO();
            return (
              <Card key={schedule.id}>
                <CardBody className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-[var(--ds-background-100)] ds-border">
                        <CalendarClock size={17} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-sm">{schedule.name}</h2>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--ds-gray-700)]">
                          {schedule.source_name || "External"}
                          {schedule.destination_name
                            ? ` → ${schedule.destination_name}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <Badge
                      tone={
                        schedule.status === "active"
                          ? due
                            ? "warning"
                            : "success"
                          : schedule.status === "paused"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {due ? "due" : schedule.status}
                    </Badge>
                  </div>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="text-xl font-semibold tabular-nums">
                        {formatCurrency(
                          schedule.amount,
                          schedule.currency || user?.currency || "USD",
                        )}
                      </p>
                      <p className="mt-1 text-[11px] capitalize text-[var(--ds-gray-700)]">
                        {schedule.frequency} · {schedule.transaction_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--ds-gray-700)]">
                        Next
                      </p>
                      <p className="mt-1 text-xs">
                        {formatDate(schedule.next_execution)}
                      </p>
                    </div>
                  </div>
                  {schedule.last_error ? (
                    <p className="mt-3 rounded-[8px] bg-[var(--ds-danger-hover)] p-2 text-[11px] leading-4 text-[var(--ds-status-red)]">
                      {schedule.last_error}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-1">
                    {due ? (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await executeRecurringSchedule(schedule.id);
                            showToast({
                              title: "Scheduled transaction posted",
                              tone: "success",
                            });
                            await refresh();
                          } catch (err) {
                            setError(
                              getErrorMessage(err, "Execution could not run"),
                            );
                          }
                        }}
                      >
                        <Zap size={13} />
                        Post now
                      </Button>
                    ) : null}
                    {schedule.status === "active" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await updateRecurringSchedule(schedule.id, {
                            status: "paused",
                          });
                          await refresh();
                        }}
                      >
                        <Pause size={13} />
                        Pause
                      </Button>
                    ) : schedule.status === "paused" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await updateRecurringSchedule(schedule.id, {
                            status: "active",
                          });
                          await refresh();
                        }}
                      >
                        <Play size={13} />
                        Resume
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setArchiveTarget(schedule)}
                    >
                      Archive
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New recurring schedule"
        className="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="recurring-form" type="submit" loading={saving}>
              Create schedule
            </Button>
          </>
        }
      >
        <form id="recurring-form" onSubmit={create} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Schedule name" id="recurring-name">
              <Input
                id="recurring-name"
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Monthly rent"
              />
            </Field>
            <Field label="Transaction type" id="recurring-type">
              <Select
                id="recurring-type"
                value={form.transaction_type}
                onChange={(event) =>
                  setType(event.target.value as TransactionType)
                }
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
              </Select>
            </Field>
          </div>
          <Field label="Ledger description" id="recurring-description">
            <Input
              id="recurring-description"
              required
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Rent payment"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount" id="recurring-amount">
              <Input
                id="recurring-amount"
                required
                min="0.01"
                step="0.01"
                type="number"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: Number(event.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Frequency" id="recurring-frequency">
              <Select
                id="recurring-frequency"
                value={form.frequency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    frequency: event.target
                      .value as RecurringSchedule["frequency"],
                  }))
                }
              >
                {FREQUENCIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {form.transaction_type !== "income" ? (
            <Field label="Source container" id="recurring-source">
              <Select
                id="recurring-source"
                required
                value={form.source_container_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    source_container_id: event.target.value,
                  }))
                }
              >
                <option value="">Select source</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {form.transaction_type !== "expense" ? (
            <Field label="Destination container" id="recurring-destination">
              <Select
                id="recurring-destination"
                required
                value={form.destination_container_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    destination_container_id: event.target.value,
                  }))
                }
              >
                <option value="">Select destination</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {form.transaction_type !== "transfer" ? (
            <Field label="Category" id="recurring-category">
              <Select
                id="recurring-category"
                value={form.category_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category_id: event.target.value,
                  }))
                }
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" id="recurring-start">
              <Input
                id="recurring-start"
                required
                type="date"
                value={form.start_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    start_date: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="End date (optional)" id="recurring-end">
              <Input
                id="recurring-end"
                type="date"
                min={form.start_date}
                value={form.end_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    end_date: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <Field label="Execution mode" id="recurring-mode">
            <Select
              id="recurring-mode"
              value={form.execution_mode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  execution_mode: event.target
                    .value as RecurringSchedule["execution_mode"],
                }))
              }
            >
              <option value="review">Review before posting</option>
              <option value="automatic">Post automatically when due</option>
            </Select>
          </Field>
          <Field label="Notes" id="recurring-notes">
            <Textarea
              id="recurring-notes"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive recurring schedule?"
        description="Future executions stop. Existing generated transactions and audit history remain unchanged."
        confirmLabel="Archive schedule"
        onClose={() => setArchiveTarget(null)}
        onConfirm={async () => {
          if (!archiveTarget) return;
          await archiveRecurringSchedule(archiveTarget.id);
          setArchiveTarget(null);
          showToast({ title: "Schedule archived", tone: "success" });
          await refresh();
        }}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody className="pt-5">
        <p className="text-[11px] text-[var(--ds-gray-700)]">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      </CardBody>
    </Card>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
