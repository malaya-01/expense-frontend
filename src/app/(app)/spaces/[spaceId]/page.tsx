"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Plus,
  Star,
  Target,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SummaryKpiCard } from "@/components/ui/summary-kpi-card";
import { Alert, Badge, Progress } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { getErrorMessage } from "@/lib/api/client";
import { APP_NAME } from "@/lib/brand";
import { useToast } from "@/components/ui/toast";
import { listAccounts } from "@/lib/api/accounts";
import {
  contributeSpaceGoal,
  createSpaceBudget,
  createSpaceExpense,
  createSpaceGoal,
  createSpaceSettlement,
  getSpaceDashboard,
  getSpaceReports,
  inviteToSpace,
  listSpaceExpenses,
  moveSpaceWallet,
  removeSpaceMember,
  setSpaceFavorite,
  updateSpaceMemberRole,
  type SpaceDashboard,
  type SpaceMember,
} from "@/lib/api/spaces";
import { enqueueSpaceDraft } from "@/lib/spaces/offline-outbox";

type Tab =
  | "overview"
  | "expenses"
  | "settle"
  | "budgets"
  | "goals"
  | "reports"
  | "members";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "expenses", label: "Expenses" },
  { id: "settle", label: "Settle" },
  { id: "budgets", label: "Budgets" },
  { id: "goals", label: "Goals" },
  { id: "reports", label: "Reports" },
  { id: "members", label: "Members" },
];

export default function SpaceDetailPage() {
  const params = useParams<{ spaceId: string }>();
  const spaceId = params.spaceId;
  const router = useRouter();
  const { showToast } = useToast();

  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<SpaceDashboard | null>(null);
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState("");
  const [splitMethod, setSplitMethod] = useState<
    "equal" | "exact" | "percentage" | "shares"
  >("equal");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [linkPersonal, setLinkPersonal] = useState(false);
  const [personalContainerId, setPersonalContainerId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const dash = await getSpaceDashboard(spaceId);
      setData(dash);
      setPayerId(dash.membership.id);
      setSelectedMembers(dash.members.map((m) => m.id));
    } catch (err) {
      showToast({
        title: "Could not load space",
        description: getErrorMessage(err, "Try again"),
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast, spaceId]);

  useEffect(() => {
    void refresh();
    listAccounts().then(setAccounts).catch(() => setAccounts([]));
  }, [refresh]);

  useEffect(() => {
    if (tab !== "reports") return;
    getSpaceReports(spaceId)
      .then(setReports)
      .catch(() => setReports(null));
  }, [spaceId, tab]);

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of data?.members || []) {
      map.set(m.id, m.display_name || m.full_name || m.email || "Member");
    }
    return (id: string) => map.get(id) || id.slice(0, 8);
  }, [data?.members]);

  const currency = data?.space.currency || "USD";
  const accent = data?.space.color || "var(--ds-status-blue)";

  async function onCreateExpense(e?: FormEvent) {
    e?.preventDefault();
    if (!data || !title.trim() || !amount) return;
    setBusy(true);
    const payload = {
      title: title.trim(),
      amount: Number(amount),
      payer_member_id: payerId,
      split_method: splitMethod,
      participants: selectedMembers.map((member_id) => ({ member_id })),
      link_to_personal: linkPersonal,
      personal_container_id: linkPersonal
        ? personalContainerId || undefined
        : undefined,
    };
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueSpaceDraft({
          client_op_id: `expense-${Date.now()}`,
          entity_type: "space_expense",
          space_id: spaceId,
          payload,
        });
        showToast({
          title: "Saved offline",
          description: "Expense queued and will sync when you are back online.",
          tone: "warning",
        });
        setExpenseOpen(false);
        return;
      }
      await createSpaceExpense(spaceId, payload);
      setExpenseOpen(false);
      setTitle("");
      setAmount("");
      showToast({ title: "Expense added", tone: "success" });
      await refresh();
    } catch (err) {
      showToast({
        title: "Expense failed",
        description: getErrorMessage(err, "Check splits and try again"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onInvite(e?: FormEvent) {
    e?.preventDefault();
    if (!inviteEmail.trim()) return;
    setBusy(true);
    try {
      const result: any = await inviteToSpace(spaceId, inviteEmail.trim());
      showToast({
        title: "Invite sent",
        description: result.delivered_in_app
          ? `They’ll see it in their ${APP_NAME} notifications inbox.`
          : "Invite created. They’ll see it after signing up with that email.",
        tone: "success",
      });
      setInviteOpen(false);
      setInviteEmail("");
      await refresh();
    } catch (err) {
      showToast({
        title: "Invite failed",
        description: getErrorMessage(err, "Try again"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-[10px] bg-[var(--ds-gray-100)]" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-[16px] bg-[var(--ds-gray-100)]"
            />
          ))}
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/spaces"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ds-gray-700)] hover:text-[var(--ds-gray-1000)] ds-focus rounded-[6px]"
          >
            <ArrowLeft size={13} />
            All spaces
          </Link>
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-[12px]"
              style={{
                color: accent,
                background: `color-mix(in srgb, ${accent} 14%, transparent)`,
              }}
            >
              <UsersRound size={18} strokeWidth={1.85} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[28px] font-semibold tracking-[-0.04em] text-[var(--ds-gray-1000)] sm:text-[32px]">
                  {data.space.name}
                </h1>
                <Badge tone="neutral">{data.membership.role}</Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-[var(--ds-gray-700)]">
                {data.members.length} members · {currency}
                {data.space.description ? ` · ${data.space.description}` : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              void setSpaceFavorite(spaceId, !data.space.is_favorite).then(refresh)
            }
          >
            <Star
              size={14}
              className={
                data.space.is_favorite
                  ? "text-[var(--ds-status-orange)]"
                  : undefined
              }
              fill={data.space.is_favorite ? "currentColor" : "none"}
            />
            {data.space.is_favorite ? "Favorited" : "Favorite"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setInviteOpen(true)}>
            <Users size={14} />
            Invite
          </Button>
          <Button size="sm" onClick={() => setExpenseOpen(true)}>
            <Plus size={14} />
            Add expense
          </Button>
        </div>
      </div>

      {data.ai_summary ? (
        <Alert
          className="mb-5"
          tone="info"
          title="Space snapshot"
          description={data.ai_summary}
        />
      ) : null}

      <div
        role="tablist"
        className="mb-6 flex gap-1 overflow-x-auto rounded-[12px] bg-[var(--ds-background-100)] p-1"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "shrink-0 rounded-[9px] px-3 py-2 text-xs font-medium transition-colors ds-focus",
              tab === item.id
                ? "bg-[var(--ds-background-elevated)] text-[var(--ds-gray-1000)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-[var(--ds-gray-700)] hover:text-[var(--ds-gray-1000)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
            <SummaryKpiCard
              title="Total spent"
              value={formatCurrency(data.metrics.total_spent, currency)}
              subtitle="Shared expenses recorded"
              icon={Wallet}
              tone="blue"
            />
            <SummaryKpiCard
              title="You owe"
              value={formatCurrency(data.metrics.you_owe, currency)}
              subtitle="Net amount to settle"
              icon={ArrowLeftRight}
              tone={data.metrics.you_owe > 0 ? "orange" : "green"}
            />
            <SummaryKpiCard
              title="You are owed"
              value={formatCurrency(data.metrics.you_are_owed, currency)}
              subtitle="Others owe you"
              icon={UsersRound}
              tone={data.metrics.you_are_owed > 0 ? "teal" : "green"}
            />
            <SummaryKpiCard
              title="Outstanding"
              value={formatCurrency(data.metrics.outstanding_settlements, currency)}
              subtitle="Positive balances still open"
              icon={ChartNoAxesCombined}
              tone="purple"
            />
            <SummaryKpiCard
              title="Shared wallet"
              value={formatCurrency(data.metrics.shared_wallet_balance, currency)}
              subtitle={data.metrics.wallet?.name || "Space wallet"}
              icon={Wallet}
              tone="cyan"
            />
            <SummaryKpiCard
              title="Budget progress"
              value={formatCurrency(data.metrics.budget_spent, currency)}
              subtitle={`of ${formatCurrency(data.metrics.total_budget || 0, currency)} planned`}
              icon={Target}
              tone="green"
              footerLeft={{
                label: "Budgets",
                value: String(data.budgets.length),
              }}
              footerRight={{
                label: "Goals",
                value: String(data.goals.length),
              }}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <Panel className="lg:col-span-3" title="Recent activity">
              {data.activity.length ? (
                <ul className="space-y-0">
                  {data.activity.slice(0, 8).map((item: any, index: number) => (
                    <li
                      key={item.id}
                      className={cn(
                        "flex items-start justify-between gap-3 py-3",
                        index > 0 &&
                          "border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)]",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--ds-gray-700)]">
                          {item.actor_name || item.actor_email || "System"}
                        </p>
                      </div>
                      <time className="shrink-0 text-[11px] tabular-nums text-[var(--ds-gray-700)]">
                        {new Date(item.created_at).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-[var(--ds-gray-700)]">
                  No activity yet. Add an expense to get started.
                </p>
              )}
            </Panel>

            <Panel className="lg:col-span-2" title="Members">
              <ul className="space-y-2">
                {data.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-[10px] bg-[var(--ds-background-100)] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--ds-gray-1000)]">
                        {m.display_name || m.full_name || m.email}
                      </p>
                      <p className="truncate text-[11px] text-[var(--ds-gray-700)]">
                        {m.email}
                      </p>
                    </div>
                    <Badge tone="neutral">{m.role}</Badge>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-3 w-full"
                size="sm"
                variant="secondary"
                onClick={() => setInviteOpen(true)}
              >
                Invite member
              </Button>
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "expenses" ? (
        <ExpensesPanel
          data={data}
          memberName={memberName}
          onAdd={() => setExpenseOpen(true)}
        />
      ) : null}

      {tab === "settle" ? (
        <SettlePanel
          data={data}
          memberName={memberName}
          accounts={accounts}
          onSettled={refresh}
          spaceId={spaceId}
        />
      ) : null}

      {tab === "budgets" ? (
        <BudgetsPanel data={data} spaceId={spaceId} onChanged={refresh} />
      ) : null}

      {tab === "goals" ? (
        <GoalsPanel data={data} spaceId={spaceId} onChanged={refresh} />
      ) : null}

      {tab === "reports" ? (
        <ReportsPanel
          reports={reports}
          currency={currency}
          memberName={memberName}
        />
      ) : null}

      {tab === "members" ? (
        <MembersPanel
          data={data}
          spaceId={spaceId}
          onInvite={() => setInviteOpen(true)}
          onChanged={refresh}
          onLeft={() => router.replace("/spaces")}
        />
      ) : null}

      <Modal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        title="Add shared expense"
        className="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setExpenseOpen(false)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={() => void onCreateExpense()}>
              Save expense
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={onCreateExpense}>
          <div>
            <Label>Title</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Dinner, hotel, groceries…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount</Label>
              <Input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Paid by</Label>
              <Select value={payerId} onChange={(e) => setPayerId(e.target.value)}>
                {data.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name || m.full_name || m.email}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Split method</Label>
            <Select
              value={splitMethod}
              onChange={(e) => setSplitMethod(e.target.value as any)}
            >
              <option value="equal">Equal</option>
              <option value="exact">Exact amount</option>
              <option value="percentage">Percentage</option>
              <option value="shares">Shares</option>
            </Select>
          </div>
          <div>
            <Label>Participants</Label>
            <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto rounded-[10px] border border-[color:color-mix(in_srgb,var(--ds-gray-1000)_12%,transparent)] p-2">
              {data.members.map((m) => {
                const checked = selectedMembers.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-xs hover:bg-[var(--ds-gray-100)]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedMembers((prev) =>
                          checked
                            ? prev.filter((id) => id !== m.id)
                            : [...prev, m.id],
                        )
                      }
                    />
                    {m.display_name || m.full_name || m.email}
                  </label>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--ds-gray-900)]">
            <input
              type="checkbox"
              checked={linkPersonal}
              onChange={(e) => setLinkPersonal(e.target.checked)}
            />
            Link my share to a personal account
          </label>
          {linkPersonal ? (
            <Select
              value={personalContainerId}
              onChange={(e) => setPersonalContainerId(e.target.value)}
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={() => void onInvite()}>
              Send invite
            </Button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={onInvite}>
          <p className="text-sm text-[var(--ds-gray-700)]">
            They’ll receive an in-app notification. No email is sent while mail
            delivery is disabled.
          </p>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="friend@example.com"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
  action,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[16px] bg-[var(--ds-background-elevated)] ds-border",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-[var(--ds-gray-1000)]">
          {title}
        </h2>
        {action}
      </div>
      <div className="px-4 py-3 sm:px-5 sm:py-4">{children}</div>
    </section>
  );
}

function ExpensesPanel({
  data,
  memberName,
  onAdd,
}: {
  data: SpaceDashboard;
  memberName: (id: string) => string;
  onAdd: () => void;
}) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listSpaceExpenses(data.space.id)
      .then(setExpenses)
      .catch(() => setExpenses([]))
      .finally(() => setLoading(false));
  }, [data.space.id, data.metrics.total_spent]);

  return (
    <Panel
      title="Shared expenses"
      action={
        <Button size="sm" onClick={onAdd}>
          <Plus size={14} />
          Add
        </Button>
      }
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-[var(--ds-gray-700)]">
          Loading expenses…
        </p>
      ) : expenses.length ? (
        <ul className="space-y-2">
          {expenses.map((expense) => (
            <li
              key={expense.id}
              className="rounded-[12px] bg-[var(--ds-background-100)] px-3 py-3 sm:px-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
                    {expense.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                    Paid by {memberName(expense.payer_member_id)} ·{" "}
                    <span className="capitalize">{expense.split_method}</span> ·{" "}
                    {expense.expense_date}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--ds-gray-1000)]">
                  {formatCurrency(Number(expense.amount), data.space.currency)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-[var(--ds-gray-700)]">
          No expenses yet. Split a shared cost to start tracking balances.
        </p>
      )}
    </Panel>
  );
}

function SettlePanel({
  data,
  memberName,
  accounts,
  onSettled,
  spaceId,
}: {
  data: SpaceDashboard;
  memberName: (id: string) => string;
  accounts: any[];
  onSettled: () => Promise<void>;
  spaceId: string;
}) {
  const { showToast } = useToast();
  const [fromId, setFromId] = useState(data.membership.id);
  const [toId, setToId] = useState(
    data.suggested_settlements[0]?.to_member_id || data.members[0]?.id || "",
  );
  const [amount, setAmount] = useState(
    String(data.suggested_settlements[0]?.amount || ""),
  );
  const [linkPersonal, setLinkPersonal] = useState(false);
  const [containerId, setContainerId] = useState("");
  const [walletAmount, setWalletAmount] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="Balances">
        <ul className="space-y-2">
          {data.balances.map((b) => (
            <li
              key={b.member_id}
              className="flex items-center justify-between gap-2 rounded-[10px] bg-[var(--ds-background-100)] px-3 py-2.5"
            >
              <span className="truncate text-sm text-[var(--ds-gray-1000)]">
                {b.display_name}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  b.net > 0
                    ? "text-[var(--ds-status-green)]"
                    : b.net < 0
                      ? "text-[var(--ds-status-orange)]"
                      : "text-[var(--ds-gray-700)]",
                )}
              >
                {formatCurrency(b.net, data.space.currency)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Settle up">
        <div className="space-y-3">
          {data.suggested_settlements.length ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ds-gray-700)]">
                Suggested
              </p>
              {data.suggested_settlements.map((s, idx) => (
                <button
                  key={`${s.from_member_id}-${s.to_member_id}-${idx}`}
                  type="button"
                  className="flex w-full items-center justify-between rounded-[10px] bg-[var(--ds-background-100)] px-3 py-2.5 text-left text-xs ds-focus hover:bg-[var(--ds-gray-100)]"
                  onClick={() => {
                    setFromId(s.from_member_id);
                    setToId(s.to_member_id);
                    setAmount(String(s.amount));
                  }}
                >
                  <span>
                    {memberName(s.from_member_id)} → {memberName(s.to_member_id)}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(s.amount, data.space.currency)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--ds-gray-700)]">All settled up.</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>From</Label>
              <Select value={fromId} onChange={(e) => setFromId(e.target.value)}>
                {data.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name || m.email}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>To</Label>
              <Select value={toId} onChange={(e) => setToId(e.target.value)}>
                {data.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name || m.email}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={linkPersonal}
              onChange={(e) => setLinkPersonal(e.target.checked)}
            />
            Pay from personal account
          </label>
          {linkPersonal ? (
            <Select
              value={containerId}
              onChange={(e) => setContainerId(e.target.value)}
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          ) : null}
          <Button
            size="sm"
            loading={busy}
            onClick={() => {
              setBusy(true);
              void createSpaceSettlement(spaceId, {
                from_member_id: fromId,
                to_member_id: toId,
                amount: Number(amount),
                link_to_personal: linkPersonal,
                personal_container_id: linkPersonal ? containerId : undefined,
              })
                .then(() => {
                  showToast({ title: "Settlement recorded", tone: "success" });
                  return onSettled();
                })
                .catch((err) =>
                  showToast({
                    title: "Settlement failed",
                    description: getErrorMessage(err, "Try again"),
                    tone: "error",
                  }),
                )
                .finally(() => setBusy(false));
            }}
          >
            Record settlement
          </Button>
        </div>
      </Panel>

      <Panel className="lg:col-span-2" title="Shared wallet">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[160px] flex-1">
            <Label>Amount</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={walletAmount}
              onChange={(e) => setWalletAmount(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              void moveSpaceWallet(spaceId, "deposit", Number(walletAmount)).then(
                onSettled,
              )
            }
          >
            Deposit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              void moveSpaceWallet(
                spaceId,
                "withdrawal",
                Number(walletAmount),
              ).then(onSettled)
            }
          >
            Withdraw
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function BudgetsPanel({
  data,
  spaceId,
  onChanged,
}: {
  data: SpaceDashboard;
  spaceId: string;
  onChanged: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-3">
      <Panel title="Create budget">
        <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
          <Input
            placeholder="Budget name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button
            size="sm"
            loading={busy}
            onClick={() => {
              setBusy(true);
              void createSpaceBudget(spaceId, {
                name,
                amount: Number(amount),
              })
                .then(() => {
                  setName("");
                  setAmount("");
                  showToast({ title: "Budget created", tone: "success" });
                  return onChanged();
                })
                .catch((err) =>
                  showToast({
                    title: "Failed",
                    description: getErrorMessage(err, "Try again"),
                    tone: "error",
                  }),
                )
                .finally(() => setBusy(false));
            }}
          >
            Add budget
          </Button>
        </div>
      </Panel>
      {data.budgets.length ? (
        data.budgets.map((b: any) => {
          const spent = Number(b.spent || 0);
          const limit = Number(b.amount || 1);
          const pct = Math.min(100, (spent / limit) * 100);
          return (
            <article
              key={b.id}
              className="rounded-[12px] bg-[var(--ds-background-elevated)] p-3 sm:rounded-[16px] sm:p-4 ds-border sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--ds-gray-1000)]">
                    {b.name}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                    {formatCurrency(spent, data.space.currency)} of{" "}
                    {formatCurrency(Number(b.amount), data.space.currency)}
                  </p>
                </div>
                <Badge tone={pct >= 100 ? "danger" : pct >= 80 ? "warning" : "success"}>
                  {pct.toFixed(0)}%
                </Badge>
              </div>
              <Progress className="mt-3" value={pct} />
            </article>
          );
        })
      ) : (
        <p className="py-6 text-center text-sm text-[var(--ds-gray-700)]">
          No space budgets yet.
        </p>
      )}
    </div>
  );
}

function GoalsPanel({
  data,
  spaceId,
  onChanged,
}: {
  data: SpaceDashboard;
  spaceId: string;
  onChanged: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-3">
      <Panel title="Create goal">
        <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
          <Input
            placeholder="Goal name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <Button
            size="sm"
            loading={busy}
            onClick={() => {
              setBusy(true);
              void createSpaceGoal(spaceId, {
                name,
                target_amount: Number(target),
              })
                .then(() => {
                  setName("");
                  setTarget("");
                  showToast({ title: "Goal created", tone: "success" });
                  return onChanged();
                })
                .catch((err) =>
                  showToast({
                    title: "Failed",
                    description: getErrorMessage(err, "Try again"),
                    tone: "error",
                  }),
                )
                .finally(() => setBusy(false));
            }}
          >
            Add goal
          </Button>
        </div>
      </Panel>
      {data.goals.length ? (
        data.goals.map((g: any) => {
          const current = Number(g.current_amount || 0);
          const goal = Number(g.target_amount || 1);
          const pct = Math.min(100, (current / goal) * 100);
          return (
            <article
              key={g.id}
              className="rounded-[12px] bg-[var(--ds-background-elevated)] p-3 sm:rounded-[16px] sm:p-4 ds-border sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--ds-gray-1000)]">
                    {g.name}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                    {formatCurrency(current, data.space.currency)} /{" "}
                    {formatCurrency(goal, data.space.currency)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void contributeSpaceGoal(spaceId, g.id, 100).then(onChanged)
                  }
                >
                  Contribute 100
                </Button>
              </div>
              <Progress className="mt-3" value={pct} />
            </article>
          );
        })
      ) : (
        <p className="py-6 text-center text-sm text-[var(--ds-gray-700)]">
          No space goals yet.
        </p>
      )}
    </div>
  );
}

function ReportsPanel({
  reports,
  currency,
  memberName,
}: {
  reports: any;
  currency: string;
  memberName: (id: string) => string;
}) {
  if (!reports) {
    return (
      <p className="py-10 text-center text-sm text-[var(--ds-gray-700)]">
        Loading reports…
      </p>
    );
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="Spend by member">
        <ul className="space-y-2">
          {(reports.spend_by_member || []).map((row: any) => (
            <li
              key={row.member_id}
              className="flex justify-between gap-2 text-sm"
            >
              <span>{row.display_name || memberName(row.member_id)}</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(Number(row.spent), currency)}
              </span>
            </li>
          ))}
          {!(reports.spend_by_member || []).length ? (
            <li className="text-sm text-[var(--ds-gray-700)]">No spend yet.</li>
          ) : null}
        </ul>
      </Panel>
      <Panel title="Spend by category">
        <ul className="space-y-2">
          {(reports.spend_by_category || []).map((row: any) => (
            <li key={row.category} className="flex justify-between gap-2 text-sm">
              <span>{row.category}</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(Number(row.spent), currency)}
              </span>
            </li>
          ))}
          {!(reports.spend_by_category || []).length ? (
            <li className="text-sm text-[var(--ds-gray-700)]">No categories yet.</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}

function MembersPanel({
  data,
  spaceId,
  onInvite,
  onChanged,
  onLeft,
}: {
  data: SpaceDashboard;
  spaceId: string;
  onInvite: () => void;
  onChanged: () => Promise<void>;
  onLeft: () => void;
}) {
  const { showToast } = useToast();
  const me = data.membership;
  const canManage = me.role === "owner" || me.role === "admin";
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    kind: "leave" | "remove" | "transfer";
    member: SpaceMember;
  }>(null);

  const confirmMember = confirm?.member;
  const confirmName =
    confirmMember?.display_name ||
    confirmMember?.full_name ||
    confirmMember?.email ||
    "this member";

  async function runConfirm() {
    if (!confirm) return;
    const { kind, member } = confirm;
    setBusy(true);
    try {
      if (kind === "transfer") {
        await updateSpaceMemberRole(spaceId, member.id, "owner");
        showToast({ title: "Ownership transferred", tone: "success" });
        setConfirm(null);
        await onChanged();
        return;
      }
      await removeSpaceMember(spaceId, member.id);
      showToast({
        title: kind === "leave" ? "You left the space" : "Member removed",
        tone: "success",
      });
      setConfirm(null);
      if (kind === "leave") {
        onLeft();
        return;
      }
      await onChanged();
    } catch (err) {
      showToast({
        title:
          kind === "leave"
            ? "Could not leave"
            : kind === "remove"
              ? "Could not remove member"
              : "Transfer failed",
        description: getErrorMessage(err, "Try again"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel
        title="Members"
        action={
          <div className="flex flex-wrap gap-2">
            {me.role !== "owner" ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setConfirm({ kind: "leave", member: me })}
              >
                Leave space
              </Button>
            ) : null}
            {canManage ? (
              <Button size="sm" onClick={onInvite}>
                Invite
              </Button>
            ) : null}
          </div>
        }
      >
        {me.role === "owner" ? (
          <p className="mb-3 text-xs text-[var(--ds-gray-700)]">
            Transfer ownership before you can leave this space.
          </p>
        ) : null}
        <ul className="space-y-2">
          {data.members.map((m: SpaceMember) => {
            const isSelf = m.id === me.id;
            const canRemoveOther = canManage && !isSelf && m.role !== "owner";
            const canTransfer =
              me.role === "owner" && !isSelf && m.role !== "guest";

            return (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[var(--ds-background-100)] px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
                    {m.display_name || m.full_name || m.email}
                    {isSelf ? " (you)" : ""}
                  </p>
                  <p className="truncate text-xs text-[var(--ds-gray-700)]">
                    {m.email}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{m.role}</Badge>
                  {canTransfer ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirm({ kind: "transfer", member: m })}
                    >
                      Make owner
                    </Button>
                  ) : null}
                  {canRemoveOther ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirm({ kind: "remove", member: m })}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => {
          if (!busy) setConfirm(null);
        }}
        busy={busy}
        destructive={confirm?.kind !== "transfer"}
        title={
          confirm?.kind === "leave"
            ? "Leave this space?"
            : confirm?.kind === "remove"
              ? "Remove member?"
              : "Transfer ownership?"
        }
        description={
          confirm?.kind === "leave"
            ? `You will lose access to “${data.space.name}” until you are invited again.`
            : confirm?.kind === "remove"
              ? `${confirmName} will be removed from “${data.space.name}”. They can be invited again later.`
              : `Make ${confirmName} the new owner of “${data.space.name}”? You will become an admin.`
        }
        confirmLabel={
          confirm?.kind === "leave"
            ? "Leave space"
            : confirm?.kind === "remove"
              ? "Remove member"
              : "Transfer ownership"
        }
        onConfirm={runConfirm}
      />
    </>
  );
}
