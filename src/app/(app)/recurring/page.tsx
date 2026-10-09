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
import { TRANSACTION_CREATED_EVENT } from "@/components/expenses/transaction-modal-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, CardGridSkeleton } from "@/components/ui/feedback";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { useInfiniteList } from "@/hooks/use-infinite-list";
import { useModulePermissions } from "@/components/permissions/permission-gate";
import { listAccounts } from "@/lib/api/accounts";
import { listCategories } from "@/lib/api/categories";
import {
  archiveRecurringSchedule,
  createRecurringSchedule,
  executeRecurringSchedule,
  skipMissedRecurringRuns,
  listRecurringSchedules,
  updateRecurringSchedule,
} from "@/lib/api/recurring";
import { getErrorMessage } from "@/lib/api/client";
import { formatDate, todayISO } from "@/lib/format";
import { recurringDueInfo } from "@/lib/recurring/schedule";
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
  const [editing, setEditing] = useState<RecurringSchedule | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user?.id) return;
      const silent = Boolean(options?.silent);
      if (!silent) {
        setLoading(true);
        setError("");
      }
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
        if (silent) return;
        setError(getErrorMessage(err, "Could not load recurring schedules"));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    void refresh();
    const onDataChanged = () => void refresh({ silent: true });
    window.addEventListener("finos:data-updated", onDataChanged);
    window.addEventListener("finos:sync-complete", onDataChanged);
    window.addEventListener(TRANSACTION_CREATED_EVENT, onDataChanged);
    return () => {
      window.removeEventListener("finos:data-updated", onDataChanged);
      window.removeEventListener("finos:sync-complete", onDataChanged);
      window.removeEventListener(TRANSACTION_CREATED_EVENT, onDataChanged);
    };
  }, [refresh]);

  const metrics = useMemo(() => {
    const active = schedules.filter((schedule) => schedule.status === "active");
    return {
      active: active.length,
      automatic: active.filter(
        (schedule) => schedule.execution_mode === "automatic",
      ).length,
      due: active.reduce(
        (sum, schedule) => sum + recurringDueInfo(schedule).dueCount,
        0,
      ),
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

  const list = useInfiniteList(visible, {
    pageSize: 20,
    resetKey: `${search}|${statusFilter}`,
  });

  // Runs a new schedule would owe immediately because it starts in the past.
  const pastStartRuns = useMemo(() => {
    if (editing || !form.start_date || form.start_date >= todayISO()) return 0;
    return recurringDueInfo({
      ...(form as unknown as RecurringSchedule),
      status: "active",
      next_execution: form.start_date,
      end_date: form.end_date || null,
    }).missedCount;
  }, [editing, form]);

  function validateSchedule(): string | null {
    const type = form.transaction_type;
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      return "Enter an amount greater than zero.";
    }
    if (type !== "income" && !form.source_container_id) {
      return "Choose the source container money leaves from.";
    }
    if (type !== "expense" && !form.destination_container_id) {
      return "Choose the destination container money arrives in.";
    }
    if (
      type === "transfer" &&
      form.source_container_id === form.destination_container_id
    ) {
      return "Source and destination must be different containers.";
    }
    return null;
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, start_date: todayISO() });
    setOpen(true);
  }

  function openEdit(schedule: RecurringSchedule) {
    setEditing(schedule);
    setForm({
      name: schedule.name,
      transaction_type: schedule.transaction_type,
      amount: Number(schedule.amount),
      description: schedule.description || "",
      category_id: schedule.category_id || "",
      source_container_id: schedule.source_container_id || "",
      destination_container_id: schedule.destination_container_id || "",
      frequency: schedule.frequency,
      start_date: schedule.start_date,
      end_date: schedule.end_date || "",
      execution_mode: schedule.execution_mode,
      notes: schedule.notes || "",
    });
    setOpen(true);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const invalid = validateSchedule();
    if (invalid) {
      showToast({
        title: "Check the schedule",
        description: invalid,
        tone: "warning",
      });
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editing) {
        // Empty strings clear optional links / the end date on the server.
        await updateRecurringSchedule(editing.id, {
          ...form,
          category_id: (form.category_id || null) as unknown as string,
          source_container_id: (form.source_container_id ||
            null) as unknown as string,
          destination_container_id: (form.destination_container_id ||
            null) as unknown as string,
          end_date: (form.end_date || null) as unknown as string,
        });
      } else {
        await createRecurringSchedule({
          ...form,
          category_id: form.category_id || undefined,
          source_container_id: form.source_container_id || undefined,
          destination_container_id: form.destination_container_id || undefined,
          end_date: form.end_date || undefined,
        });
      }
      setOpen(false);
      showToast({
        title: editing ? "Schedule updated" : "Recurring schedule created",
        description: editing
          ? "Changes apply to upcoming runs. Posted transactions are unchanged."
          : form.execution_mode === "automatic"
            ? "Due entries will post automatically through the ledger."
            : "Due entries will wait for your review.",
        tone: "success",
      });
      setEditing(null);
      await refresh();
    } catch (err) {
      const message = getErrorMessage(
        err,
        editing ? "Could not update schedule" : "Could not create schedule",
      );
      setError(message);
      showToast({
        title: editing ? "Could not update schedule" : "Could not create schedule",
        description: message,
        tone: "error",
      });
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
    if (busyId) return;
    setBusyId(schedule.id);
    const postedFor = schedule.next_execution;
    try {
      const { queued } = await executeRecurringSchedule(schedule.id);
      const remaining = recurringDueInfo(schedule).dueCount - 1;
      showToast({
        title: queued
          ? "Will post when you're back online"
          : `Posted ${schedule.name} for ${formatDate(postedFor)}`,
        description: queued
          ? undefined
          : remaining > 0
            ? `${remaining} more run${remaining === 1 ? " is" : "s are"} still due.`
            : undefined,
        tone: "success",
      });
      await refresh({ silent: true });
    } catch (err) {
      const message = getErrorMessage(err, "Execution could not run");
      showToast({
        title: "Could not post transaction",
        description: message,
        tone: "error",
      });
      await refresh({ silent: true });
    } finally {
      setBusyId(null);
    }
  }

  async function handlePostAll(schedule: RecurringSchedule, count: number) {
    if (busyId) return;
    setBusyId(schedule.id);
    let posted = 0;
    try {
      for (let i = 0; i < count; i += 1) {
        const { queued } = await executeRecurringSchedule(schedule.id);
        if (queued) break;
        posted += 1;
      }
      showToast({
        title:
          posted === count
            ? `Posted ${posted} run${posted === 1 ? "" : "s"} of ${schedule.name}`
            : `Posted ${posted} of ${count}; the rest will post when you're online`,
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: posted
          ? `Posted ${posted} of ${count}, then stopped`
          : "Could not post transactions",
        description: getErrorMessage(err, "Execution could not run"),
        tone: "error",
      });
    } finally {
      setBusyId(null);
      await refresh({ silent: true });
    }
  }

  async function handleSkipMissed(schedule: RecurringSchedule) {
    if (busyId) return;
    setBusyId(schedule.id);
    try {
      const result = await skipMissedRecurringRuns(schedule.id);
      showToast({
        title: `Skipped ${result.skipped} missed run${result.skipped === 1 ? "" : "s"}`,
        description: `Next run: ${formatDate(result.next_execution)}. Nothing was posted for the skipped dates.`,
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Could not skip missed runs",
        description: getErrorMessage(
          err,
          "Skipping needs a connection. Try again when online.",
        ),
        tone: "error",
      });
    } finally {
      setBusyId(null);
      await refresh({ silent: true });
    }
  }

  async function setScheduleStatus(
    schedule: RecurringSchedule,
    status: "paused" | "active",
  ) {
    try {
      await updateRecurringSchedule(schedule.id, { status });
      showToast({
        title: status === "paused" ? "Schedule paused" : "Schedule resumed",
        tone: "success",
      });
      await refresh();
    } catch (err) {
      showToast({
        title:
          status === "paused"
            ? "Could not pause schedule"
            : "Could not resume schedule",
        description: getErrorMessage(err, "Please try again."),
        tone: "error",
      });
    }
  }

  function handlePause(schedule: RecurringSchedule) {
    return setScheduleStatus(schedule, "paused");
  }

  function handleResume(schedule: RecurringSchedule) {
    return setScheduleStatus(schedule, "active");
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
            <Button className="shrink-0" onClick={openCreate}>
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
            onAction={perms.create ? openCreate : undefined}
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--ds-background-elevated)] px-5 py-10 text-center ds-border">
          <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
            No schedules match your filters
          </p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
          {list.items.map((schedule) => (
            <RecurringCard
              key={schedule.id}
              schedule={schedule}
              currency={user?.currency || "USD"}
              busy={busyId === schedule.id}
              onPost={perms.update ? () => handlePost(schedule) : undefined}
              onPostAll={
                perms.update
                  ? (count) => handlePostAll(schedule, count)
                  : undefined
              }
              onSkipMissed={
                perms.update ? () => handleSkipMissed(schedule) : undefined
              }
              onEdit={perms.update ? () => openEdit(schedule) : undefined}
              onPause={
                perms.update ? () => handlePause(schedule) : undefined
              }
              onResume={
                perms.update ? () => handleResume(schedule) : undefined
              }
              onArchive={
                perms.delete ? () => setArchiveTarget(schedule) : undefined
              }
            />
          ))}
        </div>
        <InfiniteScrollSentinel
          hasMore={list.hasMore}
          loading={list.loadingMore}
          onLoadMore={list.loadMore}
        />
        </>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit recurring schedule" : "New recurring schedule"}
        className="max-w-3xl"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button form="recurring-form" type="submit" loading={saving}>
              {editing ? "Save changes" : "Create schedule"}
            </Button>
          </>
        }
      >
        <form id="recurring-form" onSubmit={create} className="space-y-4">
          {editing ? (
            <p className="rounded-[10px] bg-[var(--ds-gray-100)] px-3 py-2 text-[12px] leading-5 text-[var(--ds-gray-900)]">
              Changes apply to upcoming runs. Transactions already posted by
              this schedule stay as they are.
            </p>
          ) : null}
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
                : "grid gap-4"
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
            {pastStartRuns > 0 ? (
              <p className="-mt-2 text-[11px] leading-4 text-[var(--ds-status-orange)] sm:col-span-2 sm:mt-0 sm:order-last">
                Start date is in the past: {pastStartRuns} run
                {pastStartRuns === 1 ? "" : "s"} will be due right away. Use
                today&apos;s date (or the next billing date) to only track
                upcoming payments.
              </p>
            ) : null}
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
        title="Delete this recurring schedule?"
        description="It stops creating entries. Transactions it already posted stay in your history and balances."
        confirmLabel="Delete schedule"
        destructive
        onClose={() => setArchiveTarget(null)}
        onConfirm={async () => {
          if (!archiveTarget) return;
          try {
            await archiveRecurringSchedule(archiveTarget.id);
            setArchiveTarget(null);
            showToast({ title: "Schedule deleted", tone: "success" });
            await refresh();
          } catch (err) {
            showToast({
              title: "Could not delete schedule",
              description: getErrorMessage(err, "Please try again."),
              tone: "error",
            });
          }
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
