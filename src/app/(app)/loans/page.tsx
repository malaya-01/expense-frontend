"use client";

import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  CreditCard,
  Percent,
  Plus,
  Scale,
} from "lucide-react";
import { EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, CardGridSkeleton } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ModuleHeader } from "@/components/ui/module-header";
import { SummaryKpiCard } from "@/components/ui/summary-kpi-card";
import { LoanCard } from "@/components/loans/loan-card";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { useModulePermissions } from "@/components/permissions/permission-gate";
import { listAccounts } from "@/lib/api/accounts";
import {
  archiveLoan,
  createLoan,
  getLoanAmortization,
  listLoans,
  recordLoanPayment,
  updateLoan,
} from "@/lib/api/loans";
import { getErrorMessage } from "@/lib/api/client";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import type {
  CreateLoanInput,
  FinancialContainer,
  Loan,
  LoanAmortizationRow,
} from "@/types";

const EMPTY_LOAN: CreateLoanInput = {
  container_id: "",
  name: "",
  lender: "",
  principal: 0,
  annual_interest_rate: 0,
  interest_type: "fixed",
  term_months: 12,
  start_date: todayISO(),
  payment_day: 1,
  notes: "",
};

export default function LoansPage() {
  const perms = useModulePermissions("loans");
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [accounts, setAccounts] = useState<FinancialContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [form, setForm] = useState<CreateLoanInput>(EMPTY_LOAN);
  const [saving, setSaving] = useState(false);
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null);
  const [payment, setPayment] = useState({
    source_container_id: "",
    amount: 0,
    date: todayISO(),
    notes: "",
  });
  const [scheduleLoan, setScheduleLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<LoanAmortizationRow[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Loan | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "paused" | "closed" | "archived"
  >("all");

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const [loanRows, accountRows] = await Promise.all([
        listLoans(),
        listAccounts(user.id),
      ]);
      setLoans(loanRows);
      setAccounts(accountRows);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load debts"));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const liabilities = accounts.filter((account) =>
    ["loan", "credit_card", "payable"].includes(account.type),
  );
  const fundingAccounts = accounts.filter(
    (account) =>
      !["loan", "credit_card", "payable", "receivable"].includes(account.type),
  );
  const summary = useMemo(() => {
    const active = loans.filter((loan) => loan.status === "active");
    return {
      outstanding: active.reduce(
        (sum, loan) => sum + loan.outstanding_balance,
        0,
      ),
      monthly: active.reduce((sum, loan) => sum + loan.monthly_payment, 0),
      count: active.length,
      highestRate: active.reduce(
        (highest, loan) => Math.max(highest, loan.annual_interest_rate),
        0,
      ),
    };
  }, [loans]);
  const currency = user?.currency || loans[0]?.currency || "USD";

  const visibleLoans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return loans.filter((loan) => {
      if (statusFilter !== "all" && loan.status !== statusFilter) return false;
      if (!q) return true;
      return (
        loan.name.toLowerCase().includes(q) ||
        (loan.lender || "").toLowerCase().includes(q) ||
        (loan.container_name || "").toLowerCase().includes(q)
      );
    });
  }, [loans, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_LOAN,
      container_id: liabilities.find(
        (account) => !loans.some((loan) => loan.container_id === account.id),
      )?.id || "",
    });
    setEditorOpen(true);
  }

  function openEdit(loan: Loan) {
    setEditing(loan);
    setForm({
      container_id: loan.container_id,
      name: loan.name,
      lender: loan.lender || "",
      principal: loan.principal,
      annual_interest_rate: loan.annual_interest_rate,
      interest_type: loan.interest_type,
      term_months: loan.term_months,
      start_date: loan.start_date,
      payment_day: loan.payment_day || 1,
      notes: loan.notes || "",
    });
    setEditorOpen(true);
  }

  async function saveLoan(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) await updateLoan(editing.id, form);
      else await createLoan(form);
      setEditorOpen(false);
      showToast({
        title: editing ? "Debt plan updated" : "Debt plan created",
        description: "Payoff metrics were recalculated from the linked liability.",
        tone: "success",
      });
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save debt plan"));
    } finally {
      setSaving(false);
    }
  }

  async function openSchedule(loan: Loan) {
    setScheduleLoan(loan);
    setSchedule([]);
    setScheduleLoading(true);
    try {
      setSchedule(await getLoanAmortization(loan.id));
    } catch (err) {
      setError(getErrorMessage(err, "Could not generate amortization"));
    } finally {
      setScheduleLoading(false);
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Loans & Debts"
        description="Understand every liability, repayment obligation, and path to becoming debt-free."
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search debts..."
        filter={statusFilter}
        onFilterChange={(value) =>
          setStatusFilter(value as typeof statusFilter)
        }
        filterOptions={[
          { value: "all", label: "All statuses" },
          { value: "active", label: "Active" },
          { value: "paused", label: "Paused" },
          { value: "closed", label: "Closed" },
          { value: "archived", label: "Archived" },
        ]}
        actions={
          perms.create ? (
            <Button onClick={openCreate} className="shrink-0">
              <Plus size={16} />
              Add debt plan
            </Button>
          ) : null
        }
      />

      {error ? (
        <Alert
          className="mb-5"
          tone="error"
          title="Debt data needs attention"
          description={error}
          actionLabel="Retry"
          onAction={() => void refresh()}
        />
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-3 xl:grid-cols-4">
        <SummaryKpiCard
          title="Outstanding debt"
          value={formatCurrency(summary.outstanding, currency)}
          subtitle={`${summary.count} active ${summary.count === 1 ? "plan" : "plans"}`}
          icon={Scale}
          tone="orange"
        />
        <SummaryKpiCard
          title="Monthly obligation"
          value={formatCurrency(summary.monthly, currency)}
          subtitle="Estimated scheduled payments"
          icon={CreditCard}
          tone="red"
        />
        <SummaryKpiCard
          title="Highest rate"
          value={`${summary.highestRate.toFixed(2)}%`}
          subtitle="Prioritize costly debt first"
          icon={Percent}
          tone="orange"
        />
        <SummaryKpiCard
          title="Debt health"
          value={
            summary.count === 0
              ? "Clear"
              : summary.highestRate > 15
                ? "High cost"
                : "Managed"
          }
          subtitle="Based on active interest rates"
          icon={CalendarDays}
          tone={
            summary.count === 0
              ? "green"
              : summary.highestRate > 15
                ? "red"
                : "green"
          }
        />
      </div>

      {loading ? (
        <CardGridSkeleton />
      ) : loans.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--ds-background-elevated)] ds-border">
          <EmptyState
            title="No debt plans yet"
            description={
              liabilities.length
                ? "Link a loan, credit card, or payable container to calculate payoff progress."
                : "Create a loan or credit-card container first, then add its repayment plan."
            }
            actionLabel={
              liabilities.length
                ? perms.create
                  ? "Add debt plan"
                  : undefined
                : "Open accounts"
            }
            onAction={
              liabilities.length
                ? perms.create
                  ? openCreate
                  : undefined
                : () => window.location.assign("/accounts")
            }
          />
        </div>
      ) : visibleLoans.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--ds-background-elevated)] px-5 py-10 text-center ds-border">
          <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
            No debts match your filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
          {visibleLoans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onPay={
                perms.update
                  ? () => {
                      setPaymentLoan(loan);
                      setPayment({
                        source_container_id: fundingAccounts[0]?.id || "",
                        amount: Math.min(
                          loan.monthly_payment,
                          loan.outstanding_balance,
                        ),
                        date: todayISO(),
                        notes: "",
                      });
                    }
                  : undefined
              }
              onSchedule={() => void openSchedule(loan)}
              onEdit={perms.update ? () => openEdit(loan) : undefined}
              onArchive={
                perms.delete ? () => setArchiveTarget(loan) : undefined
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? "Edit debt plan" : "Add debt plan"}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button form="loan-form" type="submit" loading={saving}>
              {editing ? "Save changes" : "Create plan"}
            </Button>
          </>
        }
      >
        <form id="loan-form" onSubmit={saveLoan} className="space-y-4">
          <div>
            <Label htmlFor="loan-container">Liability container</Label>
            <Select
              id="loan-container"
              required
              value={form.container_id}
              disabled={Boolean(editing)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  container_id: event.target.value,
                }))
              }
            >
              <option value="">Select a loan or credit account</option>
              {liabilities.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {formatCurrency(account.balance, account.currency)}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan name" id="loan-name">
              <Input
                id="loan-name"
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </Field>
            <Field label="Lender" id="loan-lender">
              <Input
                id="loan-lender"
                value={form.lender || ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lender: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Original principal" id="loan-principal">
              <Input
                id="loan-principal"
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.principal}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    principal: Number(event.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Annual interest rate" id="loan-rate">
              <Input
                id="loan-rate"
                required
                type="number"
                min="0"
                step="0.0001"
                value={form.annual_interest_rate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    annual_interest_rate: Number(event.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Interest model" id="loan-interest-type">
              <Select
                id="loan-interest-type"
                value={form.interest_type || "fixed"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    interest_type: event.target
                      .value as CreateLoanInput["interest_type"],
                  }))
                }
              >
                <option value="fixed">Fixed reducing balance</option>
                <option value="floating">Floating reducing balance</option>
                <option value="simple">Simple interest</option>
                <option value="compound">Compound interest</option>
              </Select>
            </Field>
            <Field label="Term (months)" id="loan-term">
              <Input
                id="loan-term"
                required
                type="number"
                min="1"
                max="1200"
                value={form.term_months}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    term_months: Number(event.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Monthly payment day" id="loan-payment-day">
              <Input
                id="loan-payment-day"
                type="number"
                min="1"
                max="31"
                value={form.payment_day || 1}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    payment_day: Number(event.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Start date" id="loan-start">
              <Input
                id="loan-start"
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
          </div>
          <Field label="Notes" id="loan-notes">
            <Textarea
              id="loan-notes"
              value={form.notes || ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(paymentLoan)}
        onClose={() => setPaymentLoan(null)}
        title={`Record payment${paymentLoan ? ` · ${paymentLoan.name}` : ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentLoan(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!paymentLoan) return;
                setSaving(true);
                try {
                  await recordLoanPayment(paymentLoan.id, payment);
                  setPaymentLoan(null);
                  showToast({
                    title: "Debt payment posted",
                    description:
                      "A balanced transfer journal reduced the liability.",
                    tone: "success",
                  });
                  await refresh();
                } catch (err) {
                  setError(getErrorMessage(err, "Could not record payment"));
                } finally {
                  setSaving(false);
                }
              }}
              loading={saving}
              disabled={!payment.source_container_id || payment.amount <= 0}
            >
              Post payment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Pay from" id="payment-source">
            <Select
              id="payment-source"
              value={payment.source_container_id}
              onChange={(event) =>
                setPayment((current) => ({
                  ...current,
                  source_container_id: event.target.value,
                }))
              }
            >
              <option value="">Select funding account</option>
              {fundingAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {formatCurrency(account.balance, account.currency)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount" id="payment-amount">
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                max={paymentLoan?.outstanding_balance}
                step="0.01"
                value={payment.amount}
                onChange={(event) =>
                  setPayment((current) => ({
                    ...current,
                    amount: Number(event.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Date" id="payment-date">
              <Input
                id="payment-date"
                type="date"
                value={payment.date}
                onChange={(event) =>
                  setPayment((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(scheduleLoan)}
        onClose={() => setScheduleLoan(null)}
        title={`Amortization${scheduleLoan ? ` · ${scheduleLoan.name}` : ""}`}
        className="max-w-5xl"
      >
        {scheduleLoading ? (
          <CardGridSkeleton count={3} />
        ) : (
          <div className="overflow-x-auto rounded-[10px] ds-border">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-[var(--ds-background-100)] text-[var(--ds-gray-700)]">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 text-right font-medium">Payment</th>
                  <th className="px-4 py-3 text-right font-medium">Principal</th>
                  <th className="px-4 py-3 text-right font-medium">Interest</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ds-gray-200)]">
                {schedule.map((row) => (
                  <tr key={row.installment}>
                    <td className="px-4 py-3">{row.installment}</td>
                    <td className="px-4 py-3">{formatDate(row.due_date)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(row.payment, scheduleLoan?.currency || currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(row.principal, scheduleLoan?.currency || currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(row.interest, scheduleLoan?.currency || currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(
                        row.outstanding_balance,
                        scheduleLoan?.currency || currency,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive debt plan?"
        description="The linked liability and its ledger history remain unchanged."
        confirmLabel="Archive plan"
        onClose={() => setArchiveTarget(null)}
        onConfirm={async () => {
          if (!archiveTarget) return;
          await archiveLoan(archiveTarget.id);
          setArchiveTarget(null);
          showToast({ title: "Debt plan archived", tone: "success" });
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
