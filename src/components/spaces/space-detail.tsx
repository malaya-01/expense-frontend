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
import { useRouter } from "next/navigation";
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
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getErrorMessage, isRetryableWriteError } from "@/lib/api/client";
import { APP_NAME } from "@/lib/brand";
import { useToast } from "@/components/ui/toast";
import { useInfiniteList } from "@/hooks/use-infinite-list";
import { listAccounts } from "@/lib/api/accounts";
import {
  contributeSpaceGoal,
  createSpaceBudget,
  createSpaceExpense,
  createSpaceGoal,
  createSpaceSettlement,
  deleteSpaceExpense,
  deleteSpaceSettlement,
  getSpaceDashboard,
  getSpaceReports,
  inviteToSpace,
  listSpaceExpenses,
  moveSpaceWallet,
  removeSpaceMember,
  setSpaceFavorite,
  updateSpaceExpense,
  updateSpaceMemberRole,
  type SpaceDashboard,
  type SpaceExpense,
  type SpaceMember,
  type SpaceSettlementResult,
} from "@/lib/api/spaces";
import { previewPositions, type SplitMethod } from "@/lib/spaces/split";
import { fileToReceiptPayload } from "@/lib/receipts/compress-image";
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

/**
 * Collaborative Space detail view. Rendered by `/spaces/view?id=<id>` (static
 * export friendly; the only form reachable in the Android app) and by the
 * legacy `/spaces/<id>` dynamic route on the web.
 */
export function SpaceDetail({ spaceId }: { spaceId: string }) {
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
  const [expenseDate, setExpenseDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [payerId, setPayerId] = useState("");
  const [multiPayer, setMultiPayer] = useState(false);
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>({});
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [shareValues, setShareValues] = useState<Record<string, string>>({});
  const [lineItems, setLineItems] = useState<
    Array<{ name: string; amount: string; memberIds: string[] }>
  >([{ name: "", amount: "", memberIds: [] }]);
  const [receiptFile, setReceiptFile] = useState<{
    name: string;
    mime_type: string;
    data_base64: string;
  } | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
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

  const preview = useMemo(() => {
    const total = Number(amount);
    const payers = multiPayer
      ? Object.entries(payerAmounts)
          .filter(([, value]) => Number(value) > 0)
          .map(([memberId, value]) => ({ memberId, amount: Number(value) }))
      : payerId
        ? [{ memberId: payerId, amount: total }]
        : [];
    return previewPositions({
      method: splitMethod,
      total,
      participantIds: selectedMembers,
      shareValues,
      payers,
      items: lineItems.map((item) => ({
        amount: Number(item.amount || 0),
        memberIds: item.memberIds,
      })),
    });
  }, [
    amount,
    lineItems,
    multiPayer,
    payerAmounts,
    payerId,
    selectedMembers,
    shareValues,
    splitMethod,
  ]);

  const actorPaid = data
    ? preview.rows.find((row) => row.memberId === data.membership.id)?.paid || 0
    : 0;

  function resetExpenseForm() {
    setTitle("");
    setAmount("");
    setNotes("");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setSplitMethod("equal");
    setShareValues({});
    setMultiPayer(false);
    setPayerAmounts({});
    setLineItems([{ name: "", amount: "", memberIds: [] }]);
    setReceiptFile(null);
    setEditingExpenseId(null);
    setLinkPersonal(false);
    if (data) {
      setPayerId(data.membership.id);
      setSelectedMembers(data.members.map((m) => m.id));
    }
  }

  function openExpense(expense?: SpaceExpense) {
    if (!data) return;
    if (!expense) {
      resetExpenseForm();
      setExpenseOpen(true);
      return;
    }
    setEditingExpenseId(expense.id);
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setExpenseDate(expense.expense_date || new Date().toISOString().slice(0, 10));
    setNotes(expense.notes || "");
    setSplitMethod((expense.split_method as SplitMethod) || "equal");
    const payers = expense.payers?.length
      ? expense.payers
      : [{ member_id: expense.payer_member_id, paid_amount: expense.amount }];
    setPayerId(payers[0]?.member_id || data.membership.id);
    setMultiPayer(payers.length > 1);
    setPayerAmounts(
      Object.fromEntries(payers.map((p) => [p.member_id, String(p.paid_amount)])),
    );
    setSelectedMembers(expense.splits.map((s) => s.member_id));
    setShareValues(
      Object.fromEntries(
        expense.splits.map((s) => [s.member_id, String(s.share_value ?? s.owed_amount)]),
      ),
    );
    setLineItems(
      expense.line_items?.length
        ? expense.line_items.map((item) => ({
            name: item.name || "",
            amount: String(item.amount),
            memberIds: item.member_ids || [],
          }))
        : [{ name: "", amount: "", memberIds: [] }],
    );
    setReceiptFile(null);
    setLinkPersonal(false);
    setExpenseOpen(true);
  }

  async function onCreateExpense(e?: FormEvent) {
    e?.preventDefault();
    if (!data || !title.trim() || !amount) return;
    if (preview.error) {
      showToast({ title: "Check the split", description: preview.error, tone: "warning" });
      return;
    }
    const total = Number(amount);
    setBusy(true);
    const payers = multiPayer
      ? Object.entries(payerAmounts)
          .filter(([, value]) => Number(value) > 0)
          .map(([member_id, value]) => ({
            member_id,
            paid_amount: Number(value),
          }))
      : undefined;
    const payload = {
      title: title.trim(),
      amount: total,
      expense_date: expenseDate,
      notes: notes.trim() || undefined,
      payer_member_id: payerId,
      payers,
      split_method: splitMethod,
      participants:
        splitMethod === "itemized"
          ? undefined
          : selectedMembers.map((member_id) =>
              splitMethod === "equal"
                ? { member_id }
                : { member_id, share_value: Number(shareValues[member_id] || 0) },
            ),
      line_items:
        splitMethod === "itemized"
          ? lineItems.map((item) => ({
              name: item.name.trim() || undefined,
              amount: Number(item.amount),
              member_ids: item.memberIds,
            }))
          : undefined,
      receipt_name: receiptFile?.name,
      receipt_mime_type: receiptFile?.mime_type,
      receipt_base64: receiptFile?.data_base64,
      link_to_personal: Boolean(editingExpenseId) ? false : linkPersonal,
      personal_container_id:
        !editingExpenseId && linkPersonal
          ? personalContainerId || undefined
          : undefined,
      client_op_id: editingExpenseId ? undefined : `expense-${Date.now()}`,
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
      try {
        const saved = editingExpenseId
          ? await updateSpaceExpense(spaceId, editingExpenseId, payload)
          : await createSpaceExpense(spaceId, payload);
        const effect = saved?.ledger_effect;
        showToast({
          title: editingExpenseId ? "Expense updated" : "Expense added",
          description: effect
            ? `Your account is down ${formatCurrency(effect.paid || 0, currency)}. ${
                effect.receivable
                  ? `${formatCurrency(effect.receivable, currency)} is waiting from the others.`
                  : "Nothing is waiting back."
              }`
            : "The group balance is updated. No personal account was changed.",
          tone: "success",
        });
        setExpenseOpen(false);
        resetExpenseForm();
        await refresh();
        return;
      } catch (err) {
        // Only queue when the server never processed the request; validation
        // errors would otherwise sit in the outbox and never sync.
        if (!isRetryableWriteError(err)) throw err;
        await enqueueSpaceDraft({
          client_op_id: `expense-${Date.now()}`,
          entity_type: "space_expense",
          space_id: spaceId,
          payload,
        });
        showToast({
          title: "Saved locally",
          description: "Server was unreachable. Expense will sync when possible.",
          tone: "warning",
        });
        setExpenseOpen(false);
        return;
      }
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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
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
          <Button size="sm" onClick={() => openExpense()}>
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
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

          <Panel
            title="Who owes whom"
            action={
              <Button size="sm" variant="secondary" onClick={() => setTab("settle")}>
                Settle
              </Button>
            }
          >
            {data.suggested_settlements.length ? (
              <ul className="space-y-2">
                {data.suggested_settlements.map((s, idx) => (
                  <li
                    key={`${s.from_member_id}-${s.to_member_id}-${idx}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate text-[var(--ds-gray-1000)]">
                      {memberName(s.from_member_id)} pays {memberName(s.to_member_id)}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatCurrency(s.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--ds-gray-700)]">
                Everyone is settled. New shared bills will show the shortest way to pay each other back.
              </p>
            )}
            <p className="mt-3 text-xs text-[var(--ds-gray-700)]">
              These are suggestions. A balance changes only when a settlement is recorded. Paying outside the app does not, until someone records it here.
            </p>
          </Panel>

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
                        {formatDateTime(item.created_at)}
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
          onAdd={() => openExpense()}
          onEdit={(expense) => openExpense(expense)}
          onChanged={refresh}
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
        title={editingExpenseId ? "Edit shared expense" : "Add shared expense"}
        className="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setExpenseOpen(false)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={() => onCreateExpense()}>
              Save expense
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={onCreateExpense}>
          <p className="text-xs text-[var(--ds-gray-700)]">
            The space keeps who paid and who owes. A personal account changes only if you authorize it below.
          </p>
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
              <Label>Date</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Paid by</Label>
            {multiPayer ? (
              <div className="mt-1.5 space-y-1">
                {data.members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate">
                      {m.display_name || m.full_name || m.email}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="Paid"
                      className="w-28 rounded-[8px] border border-[color:color-mix(in_srgb,var(--ds-gray-1000)_12%,transparent)] bg-transparent px-2 py-1 text-base sm:text-xs"
                      value={payerAmounts[m.id] ?? ""}
                      onChange={(e) =>
                        setPayerAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                    />
                  </label>
                ))}
              </div>
            ) : (
              <Select value={payerId} onChange={(e) => setPayerId(e.target.value)}>
                {data.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name || m.full_name || m.email}
                  </option>
                ))}
              </Select>
            )}
            <button
              type="button"
              className="mt-1 text-xs text-[var(--ds-gray-700)] underline-offset-2 hover:underline"
              onClick={() => {
                setMultiPayer((on) => !on);
                if (!multiPayer && payerId) {
                  setPayerAmounts({ [payerId]: amount });
                }
              }}
            >
              {multiPayer ? "One person paid" : "More than one person paid"}
            </button>
          </div>
          <div>
            <Label>Split</Label>
            <Select
              value={splitMethod}
              onChange={(e) => setSplitMethod(e.target.value as SplitMethod)}
            >
              <option value="equal">Equal</option>
              <option value="exact">Exact amount</option>
              <option value="percentage">Percentage</option>
              <option value="shares">Shares</option>
              <option value="itemized">By receipt line</option>
            </Select>
          </div>
          {splitMethod === "itemized" ? (
            <div className="space-y-2">
              <Label>Receipt lines</Label>
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-[10px] border border-[color:color-mix(in_srgb,var(--ds-gray-1000)_12%,transparent)] p-2"
                >
                  <div className="grid grid-cols-[1fr_6.5rem] gap-2">
                    <Input
                      value={item.name}
                      placeholder="Item"
                      onChange={(e) =>
                        setLineItems((prev) =>
                          prev.map((row, i) =>
                            i === index ? { ...row, name: e.target.value } : row,
                          ),
                        )
                      }
                    />
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) =>
                        setLineItems((prev) =>
                          prev.map((row, i) =>
                            i === index ? { ...row, amount: e.target.value } : row,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.members.map((m) => {
                      const on = item.memberIds.includes(m.id);
                      const label = m.display_name || m.full_name || m.email || "Member";
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={cn(
                            "rounded-full px-2 py-1 text-[11px]",
                            on
                              ? "bg-[var(--ds-gray-1000)] text-[var(--ds-background)]"
                              : "bg-[var(--ds-background-100)] text-[var(--ds-gray-700)]",
                          )}
                          onClick={() =>
                            setLineItems((prev) =>
                              prev.map((row, i) =>
                                i === index
                                  ? {
                                      ...row,
                                      memberIds: on
                                        ? row.memberIds.filter((id) => id !== m.id)
                                        : [...row.memberIds, m.id],
                                    }
                                  : row,
                              ),
                            )
                          }
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setLineItems((prev) => [...prev, { name: "", amount: "", memberIds: [] }])
                }
              >
                Add line
              </Button>
            </div>
          ) : (
            <div>
              <Label>Who shares it</Label>
              <p className="mb-1 text-[11px] text-[var(--ds-gray-700)]">
                Leave someone out if they were not part of this bill. The person who paid can be left out too.
              </p>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-[10px] border border-[color:color-mix(in_srgb,var(--ds-gray-1000)_12%,transparent)] p-2">
                {data.members.map((m) => {
                  const checked = selectedMembers.includes(m.id);
                  const label = m.display_name || m.full_name || m.email;
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
                            checked ? prev.filter((id) => id !== m.id) : [...prev, m.id],
                          )
                        }
                      />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      {checked && splitMethod !== "equal" ? (
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          aria-label={`${splitMethod} for ${label}`}
                          placeholder={
                            splitMethod === "exact"
                              ? "Amount"
                              : splitMethod === "percentage"
                                ? "%"
                                : "Shares"
                          }
                          className="w-24 rounded-[8px] border border-[color:color-mix(in_srgb,var(--ds-gray-1000)_12%,transparent)] bg-transparent px-2 py-1 text-base sm:text-xs"
                          value={shareValues[m.id] ?? ""}
                          onClick={(e) => e.preventDefault()}
                          onChange={(e) =>
                            setShareValues((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                        />
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {preview.rows.length ? (
            <div className="rounded-[10px] bg-[var(--ds-background-100)] px-3 py-2 text-xs">
              <p className="font-medium text-[var(--ds-gray-1000)]">This bill</p>
              <ul className="mt-1 space-y-1">
                {preview.rows.map((row) => (
                  <li key={row.memberId} className="flex justify-between gap-2">
                    <span className="truncate">{memberName(row.memberId)}</span>
                    <span className="shrink-0 tabular-nums text-[var(--ds-gray-700)]">
                      {row.net > 0.009
                        ? `gets back ${formatCurrency(row.net, currency)}`
                        : row.net < -0.009
                          ? `owes ${formatCurrency(Math.abs(row.net), currency)}`
                          : `share ${formatCurrency(row.share, currency)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : preview.error && amount ? (
            <p className="text-xs text-[var(--ds-status-orange)]">{preview.error}</p>
          ) : null}
          <div>
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label>Receipt</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  setReceiptFile(null);
                  return;
                }
                void fileToReceiptPayload(file)
                  .then((payload) =>
                    setReceiptFile({
                      name: payload.name,
                      mime_type: payload.mime_type,
                      data_base64: payload.data_base64,
                    }),
                  )
                  .catch((err) =>
                    showToast({
                      title: "Receipt not added",
                      description: err instanceof Error ? err.message : "Try a smaller photo",
                      tone: "warning",
                    }),
                  );
              }}
            />
          </div>
          {!editingExpenseId && actorPaid > 0 ? (
            <>
              <label className="flex items-start gap-2 text-xs text-[var(--ds-gray-900)]">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={linkPersonal}
                  onChange={(e) => setLinkPersonal(e.target.checked)}
                />
                <span>
                  Record the {formatCurrency(actorPaid, currency)} I paid on my account.
                  What the others owe is kept as money owed to me, and comes back to this account when they settle.
                </span>
              </label>
              {linkPersonal ? (
                <Select
                  value={personalContainerId}
                  onChange={(e) => setPersonalContainerId(e.target.value)}
                >
                  <option value="">Account the money left</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              ) : null}
            </>
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
  onEdit,
  onChanged,
}: {
  data: SpaceDashboard;
  memberName: (id: string) => string;
  onAdd: () => void;
  onEdit: (expense: SpaceExpense) => void;
  onChanged: () => Promise<void>;
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

  const list = useInfiniteList(expenses, { pageSize: 20 });
  const { showToast } = useToast();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        <>
        <ul className="space-y-2">
          {list.items.map((expense) => (
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
                    Paid by{" "}
                    {(expense.payers?.length
                      ? expense.payers
                      : [
                          {
                            member_id: expense.payer_member_id,
                            paid_amount: expense.amount,
                          },
                        ]
                    )
                      .map(
                        (p: { member_id: string; paid_amount: number }) =>
                          `${memberName(p.member_id)} ${formatCurrency(Number(p.paid_amount), data.space.currency)}`,
                      )
                      .join(", ")}{" "}
                    · <span className="capitalize">{expense.split_method}</span> ·{" "}
                    {expense.expense_date}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--ds-gray-1000)]">
                  {formatCurrency(Number(expense.amount), data.space.currency)}
                </p>
              </div>
              {expense.splits?.length ? (
                <ul className="mt-2 space-y-1">
                  {expense.splits.map((split: { member_id: string; owed_amount: number }) => {
                    const paid =
                      expense.payers?.find(
                        (p: { member_id: string }) => p.member_id === split.member_id,
                      )?.paid_amount ||
                      (expense.payer_member_id === split.member_id && !expense.payers?.length
                        ? Number(expense.amount)
                        : 0);
                    const net = Number(paid) - Number(split.owed_amount);
                    return (
                      <li
                        key={split.member_id}
                        className="flex justify-between gap-2 text-xs text-[var(--ds-gray-700)]"
                      >
                        <span className="truncate">{memberName(split.member_id)}</span>
                        <span className="shrink-0 tabular-nums">
                          share {formatCurrency(Number(split.owed_amount), data.space.currency)}
                          {net > 0.009
                            ? ` · gets back ${formatCurrency(net, data.space.currency)}`
                            : net < -0.009
                              ? ` · owes ${formatCurrency(Math.abs(net), data.space.currency)}`
                              : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {(expense.payers || [])
                .filter(
                  (p: { member_id: string }) =>
                    !expense.splits?.some(
                      (s: { member_id: string }) => s.member_id === p.member_id,
                    ),
                )
                .map((p: { member_id: string; paid_amount: number }) => (
                  <p key={p.member_id} className="mt-1 text-xs text-[var(--ds-gray-700)]">
                    {memberName(p.member_id)} paid and does not share it · gets back{" "}
                    {formatCurrency(Number(p.paid_amount), data.space.currency)}
                  </p>
                ))}
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => onEdit(expense)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPendingDelete(expense.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <InfiniteScrollSentinel
          hasMore={list.hasMore}
          loading={list.loadingMore}
          onLoadMore={list.loadMore}
        />
        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title="Delete this bill?"
          description="The group balance drops this bill. Any account postings that were authorized for it are reversed too."
          confirmLabel="Delete bill"
          destructive
          busy={deleting}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            if (!pendingDelete) return;
            setDeleting(true);
            void deleteSpaceExpense(data.space.id, pendingDelete)
              .then(async () => {
                setPendingDelete(null);
                showToast({ title: "Bill removed", tone: "success" });
                await onChanged();
              })
              .catch((err) =>
                showToast({
                  title: "Could not delete",
                  description: getErrorMessage(err, "Try again"),
                  tone: "error",
                }),
              )
              .finally(() => setDeleting(false));
          }}
        />
        </>
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

  // Returning the promise lets Button show its pending state (no double taps).
  async function moveWallet(kind: "deposit" | "withdrawal") {
    const value = Number(walletAmount);
    if (!(value > 0)) {
      showToast({
        title: "Enter an amount",
        description: "Wallet amounts must be greater than zero.",
        tone: "warning",
      });
      return;
    }
    try {
      await moveSpaceWallet(spaceId, kind, value);
      setWalletAmount("");
      showToast({
        title: kind === "deposit" ? "Deposit recorded" : "Withdrawal recorded",
        tone: "success",
      });
      await onSettled();
    } catch (err) {
      showToast({
        title: "Wallet update failed",
        description: getErrorMessage(err, "Try again"),
        tone: "error",
      });
    }
  }
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
                  "text-right text-sm font-semibold tabular-nums",
                  b.net > 0
                    ? "text-[var(--ds-status-green)]"
                    : b.net < 0
                      ? "text-[var(--ds-status-orange)]"
                      : "text-[var(--ds-gray-700)]",
                )}
              >
                {b.net > 0.009
                  ? `gets back ${formatCurrency(b.net, data.space.currency)}`
                  : b.net < -0.009
                    ? `owes ${formatCurrency(Math.abs(b.net), data.space.currency)}`
                    : "settled"}
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
          {fromId === data.membership.id || toId === data.membership.id ? (
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={linkPersonal}
                onChange={(e) => setLinkPersonal(e.target.checked)}
              />
              <span>
                {fromId === data.membership.id
                  ? "Take this out of my account. I am paying them."
                  : "Add this to my account. If this space already shows money owed to me, that receivable goes down by the same amount."}
              </span>
            </label>
          ) : (
            <p className="text-xs text-[var(--ds-gray-700)]">
              The group balance updates either way. A personal account changes only for the person paying or the person receiving, and only if they choose it.
            </p>
          )}
          {linkPersonal && (fromId === data.membership.id || toId === data.membership.id) ? (
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
              if (!(Number(amount) > 0) || !fromId || !toId || fromId === toId) {
                showToast({
                  title: "Check the settlement",
                  description: "Pick two different members and an amount above zero.",
                  tone: "warning",
                });
                return;
              }
              setBusy(true);
              const actorSide =
                fromId === data.membership.id || toId === data.membership.id;
              void createSpaceSettlement(spaceId, {
                from_member_id: fromId,
                to_member_id: toId,
                amount: Number(amount),
                link_to_personal: actorSide && linkPersonal,
                personal_container_id:
                  actorSide && linkPersonal ? containerId : undefined,
                client_op_id: `settlement-${Date.now()}`,
              })
                .then((saved: SpaceSettlementResult) => {
                  setAmount("");
                  const effect = saved?.ledger_effect;
                  showToast({
                    title: "Settlement recorded",
                    description: effect
                      ? effect.direction === "received"
                        ? `${formatCurrency(effect.amount || 0, data.space.currency)} was added to your account.`
                        : `${formatCurrency(effect.amount || 0, data.space.currency)} left your account.${
                            saved?.counterparty_collected
                              ? " The person you paid already connected an account, so theirs was updated too."
                              : ""
                          }`
                      : saved?.counterparty_collected
                        ? "The group balance is updated. The person who was owed already connected an account, so that repayment went back to them."
                        : "The group balance is updated. No personal account was changed.",
                    tone: "success",
                  });
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
          {data.recent_settlements?.length ? (
            <ul className="space-y-1.5 border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] pt-3">
              {data.recent_settlements.slice(0, 5).map((row: any) => (
                <li key={row.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-[var(--ds-gray-700)]">
                    {memberName(row.from_member_id)} paid {memberName(row.to_member_id)}{" "}
                    {formatCurrency(Number(row.amount), data.space.currency)}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-[var(--ds-gray-700)] underline-offset-2 hover:underline"
                    onClick={() => {
                      void deleteSpaceSettlement(spaceId, row.id)
                        .then(() => {
                          showToast({ title: "Settlement removed", tone: "success" });
                          return onSettled();
                        })
                        .catch((err) =>
                          showToast({
                            title: "Could not remove settlement",
                            description: getErrorMessage(err, "Try again"),
                            tone: "error",
                          }),
                        );
                    }}
                  >
                    Undo
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
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
            onClick={() => moveWallet("deposit")}
          >
            Deposit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => moveWallet("withdrawal")}
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
