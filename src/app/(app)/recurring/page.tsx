"use client";

import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AlertTriangle, CalendarClock, Plus, Zap } from "lucide-react";
import { EmptyState } from "@/components/ui/page-header";
import { ModuleHeader } from "@/components/ui/module-header";
import { SummaryKpiCard } from "@/components/ui/summary-kpi-card";
import { RecurringCard } from "@/components/recurring/recurring-card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, CardGridSkeleton } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { useModulePermissions } from "@/components/permissions/permission-gate";
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
import { todayISO } from "@/lib/format";
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

type StatusFilter = "all" | "active" | "paused" | "archived";

export default function RecurringPage() {
  const perms = useModulePermissions("recurring");
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schedules.filter((schedule) => {
      const matchesStatus =
        statusFilter === "all" || schedule.status === statusFilter;
      const matchesSearch =
        !q ||
        schedule.name.toLowerCase().includes(q) ||
        schedule.description?.toLowerCase().includes(q) ||
        schedule.source_name?.toLowerCase().includes(q) ||
        schedule.destination_name?.toLowerCase().includes(q) ||
        schedule.transaction_type.includes(q) ||
        schedule.frequency.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [schedules, search, statusFilter]);

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

  async function handlePost(schedule: RecurringSchedule) {
    try {
      await executeRecurringSchedule(schedule.id);
      showToast({
        title: "Scheduled transaction posted",
        tone: "success",
      });
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Execution could not run"));
    }
  }

  async function handlePause(schedule: RecurringSchedule) {
    await updateRecurringSchedule(schedule.id, { status: "paused" });
    await refresh();
  }

  async function handleResume(schedule: RecurringSchedule) {
    await updateRecurringSchedule(schedule.id, { status: "active" });
    await refresh();
  }

  return (
    <div>
      <ModuleHeader
        title="Recurring"
        description="Automate predictable money movement while keeping every execution traceable and reversible."
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search schedules..."
        filter={statusFilter}
        onFilterChange={(value) => setStatusFilter(value as StatusFilter)}
        filterLabel="Status"
        filterOptions={[
          { value: "all", label: "All statuses" },
          { value: "active", label: "Active" },
          { value: "paused", label: "Paused" },
          { value: "archived", label: "Archived" },
        ]}
        actions={
          perms.create ? (
            <Button
              className="shrink-0"
              onClick={() => {
                setForm({ ...EMPTY, start_date: todayISO() });
                setOpen(true);
              }}
            >
              <Plus size={16} />
              New schedule
            </Button>
          ) : null
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

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-3 sm:gap-3">
        <SummaryKpiCard
          title="Active schedules"
          value={String(metrics.active)}
          subtitle="Currently running"
          icon={CalendarClock}
          tone="blue"
        />
        <SummaryKpiCard
          title="Automatic"
          value={String(metrics.automatic)}
          subtitle="Post without review"
          icon={Zap}
          tone="teal"
        />
        <SummaryKpiCard
          title="Due for posting"
          value={String(metrics.due)}
          subtitle="Ready to execute"
          icon={AlertTriangle}
          tone={metrics.due > 0 ? "orange" : "green"}
        />
      </div>

      {loading ? (
        <CardGridSkeleton />
      ) : schedules.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--ds-background-elevated)] ds-border">
          <EmptyState
            title="No recurring schedules"
            description="Automate salary, rent, subscriptions, savings transfers, EMIs, and other predictable events."
            actionLabel={perms.create ? "Create schedule" : undefined}
            onAction={
              perms.create
                ? () => {
                    setForm({ ...EMPTY, start_date: todayISO() });
                    setOpen(true);
                  }
                : undefined
            }
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--ds-background-elevated)] px-5 py-10 text-center ds-border">
          <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
            No schedules match your filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
          {visible.map((schedule) => (
            <RecurringCard
              key={schedule.id}
              schedule={schedule}
              currency={user?.currency || "USD"}
              onPost={
                perms.update ? () => void handlePost(schedule) : undefined
              }
              onPause={
                perms.update ? () => void handlePause(schedule) : undefined
              }
              onResume={
                perms.update ? () => void handleResume(schedule) : undefined
              }
              onArchive={
                perms.delete ? () => setArchiveTarget(schedule) : undefined
              }
            />
          ))}
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
          <div
            className={
              form.transaction_type === "transfer"
                ? "grid gap-4 rounded-[10px] bg-[var(--ds-background-100)] p-3.5 sm:grid-cols-2"
                : "contents"
            }
          >
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
                    destination_container_id:
                      current.destination_container_id === event.target.value
                        ? ""
                        : current.destination_container_id,
                  }))
                }
              >
                <option value="">Select source</option>
                {accounts
                  .filter(
                    (account) =>
                      form.transaction_type !== "transfer" ||
                      account.id !== form.destination_container_id,
                  )
                  .map((account) => (
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
                    source_container_id:
                      current.source_container_id === event.target.value
                        ? ""
                        : current.source_container_id,
                  }))
                }
              >
                <option value="">Select destination</option>
                {accounts
                  .filter(
                    (account) =>
                      form.transaction_type !== "transfer" ||
                      account.id !== form.source_container_id,
                  )
                  .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          </div>
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
