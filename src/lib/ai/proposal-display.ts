import type { AiActionProposal } from "@/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ProposalNameMaps = {
  accounts: Record<string, string>;
  categories: Record<string, string>;
  goals: Record<string, string>;
  budgets: Record<string, string>;
  loans: Record<string, string>;
  holdings: Record<string, string>;
  recurring: Record<string, string>;
};

export type ProposalDisplayRow = {
  label: string;
  value: string;
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  title: "Title",
  type: "Type",
  amount: "Amount",
  balance: "Balance",
  currency: "Currency",
  date: "Date",
  description: "Description",
  notes: "Notes",
  merchant: "Merchant",
  institution: "Institution",
  color: "Color",
  icon: "Icon",
  summary: "Summary",
  frequency: "Frequency",
  period: "Period",
  target_amount: "Target amount",
  current_amount: "Current amount",
  target_date: "Target date",
  budget_amount: "Budget amount",
  budget_period: "Budget period",
  include_in_net_worth: "Include in net worth",
  category_id: "Category",
  parent_id: "Parent category",
  source_container_id: "Paid from",
  destination_container_id: "Deposited to",
  container_id: "Account",
  account_id: "Account",
  goal_id: "Goal",
  budget_id: "Budget",
  loan_id: "Loan",
  holding_id: "Holding",
  investment_id: "Holding",
  recurring_id: "Recurring schedule",
  schedule_id: "Recurring schedule",
  transaction_id: "Transaction",
  id: "Item",
};

const HIDDEN_KEYS = new Set([
  "user_id",
  "conversation_id",
  "proposal_id",
  "created_at",
  "updated_at",
  "deleted_at",
]);

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

function humanizeKey(key: string): string {
  return key
    .replace(/_id$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatScalar(value: unknown, currency?: string): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (
      currency &&
      Number.isFinite(value) &&
      Math.abs(value) >= 0.01
    ) {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }).format(value);
      } catch {
        return `${value} ${currency}`;
      }
    }
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "—";
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    }
    return trimmed.replace(/_/g, " ");
  }
  return String(value);
}

function resolveId(
  key: string,
  id: string,
  actionType: string,
  maps: ProposalNameMaps,
): string | null {
  const lookupOrder: Array<keyof ProposalNameMaps> = [];
  const k = key.toLowerCase();

  if (k.includes("category") || k === "parent_id") lookupOrder.push("categories");
  if (
    k.includes("container") ||
    k.includes("account") ||
    k === "source_container_id" ||
    k === "destination_container_id"
  ) {
    lookupOrder.push("accounts");
  }
  if (k.includes("goal")) lookupOrder.push("goals");
  if (k.includes("budget")) lookupOrder.push("budgets");
  if (k.includes("loan")) lookupOrder.push("loans");
  if (k.includes("holding") || k.includes("investment")) {
    lookupOrder.push("holdings");
  }
  if (k.includes("recurring") || k.includes("schedule")) {
    lookupOrder.push("recurring");
  }

  if (k === "id") {
    if (actionType.includes("category")) lookupOrder.push("categories");
    if (actionType.includes("goal")) lookupOrder.push("goals");
    if (actionType.includes("budget")) lookupOrder.push("budgets");
    if (actionType.includes("loan")) lookupOrder.push("loans");
    if (actionType.includes("holding") || actionType.includes("investment")) {
      lookupOrder.push("holdings");
    }
    if (actionType.includes("recurring")) lookupOrder.push("recurring");
    if (actionType.includes("account") || actionType.includes("transaction")) {
      lookupOrder.push("accounts");
    }
  }

  if (!lookupOrder.length) {
    lookupOrder.push(
      "accounts",
      "categories",
      "goals",
      "budgets",
      "loans",
      "holdings",
      "recurring",
    );
  }

  for (const mapKey of lookupOrder) {
    const name = maps[mapKey]?.[id];
    if (name) return name;
  }
  return null;
}

function labelFor(key: string, actionType: string): string {
  if (key === "id") {
    if (actionType.includes("category")) return "Category";
    if (actionType.includes("goal")) return "Goal";
    if (actionType.includes("budget")) return "Budget";
    if (actionType.includes("loan")) return "Loan";
    if (actionType.includes("recurring")) return "Schedule";
    if (actionType.includes("holding")) return "Holding";
    if (actionType.includes("account")) return "Account";
    if (actionType.includes("transaction")) return "Transaction";
  }
  return FIELD_LABELS[key] || humanizeKey(key);
}

/**
 * Turn a proposal payload into end-user rows. UUID fields become names;
 * unresolved IDs are omitted rather than shown as raw UUIDs.
 */
export function buildProposalDisplayRows(
  proposal: AiActionProposal,
  maps: ProposalNameMaps,
): ProposalDisplayRow[] {
  const payload = proposal.payload || {};
  const currency =
    typeof payload.currency === "string" ? payload.currency : undefined;
  const rows: ProposalDisplayRow[] = [];

  for (const [key, raw] of Object.entries(payload)) {
    if (HIDDEN_KEYS.has(key)) continue;
    if (raw == null || raw === "") continue;
    if (typeof raw === "object") continue;

    const label = labelFor(key, proposal.action_type);

    if (isUuid(raw) || /_id$/i.test(key) || key === "id") {
      if (!isUuid(raw)) {
        // Non-UUID id-like field — show as text
        rows.push({ label, value: formatScalar(raw, currency) });
        continue;
      }
      const name = resolveId(key, raw.trim(), proposal.action_type, maps);
      if (name) {
        rows.push({ label, value: name });
      }
      // Skip unresolved UUIDs — never show them to end users.
      continue;
    }

    const moneyKeys = new Set([
      "amount",
      "balance",
      "target_amount",
      "current_amount",
      "budget_amount",
    ]);
    rows.push({
      label,
      value: formatScalar(raw, moneyKeys.has(key) ? currency : undefined),
    });
  }

  return rows;
}

export function actionTypeLabel(actionType: string): string {
  return actionType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
