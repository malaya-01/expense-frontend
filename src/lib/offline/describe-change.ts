import { formatCurrency, formatDate } from "@/lib/format";
import { timeFromPaidAt } from "@/lib/receipts/defaults-from-parse";
import type { OutboxOp, SyncEntityType } from "./db";

/**
 * Turns raw sync records into what a person recognises: the entry's name,
 * amount, date/time and accounts — never ids. Used by the Sync issues page.
 */

type Row = Record<string, unknown>;

export type NameLookup = {
  accounts: Map<string, { name: string; currency: string }>;
  categories: Map<string, string>;
  /** Other named things (recurring schedules, goals, loans) by id. */
  names: Map<string, string>;
};

export type ChangeSummary = {
  kind: string;
  title: string;
  amount?: { text: string; tone: "in" | "out" | "neutral" };
  when?: string;
  where?: string;
};

const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => Number(v) || 0;

function accountName(lookup: NameLookup, id: unknown) {
  return id ? lookup.accounts.get(str(id))?.name || "a deleted account" : "";
}

function money(lookup: NameLookup, row: Row, amountKey = "amount") {
  const currency =
    str(row.currency) ||
    lookup.accounts.get(str(row.source_container_id))?.currency ||
    lookup.accounts.get(str(row.destination_container_id))?.currency ||
    lookup.accounts.get(str(row.container_id))?.currency ||
    "INR";
  return formatCurrency(num(row[amountKey]), currency.toUpperCase());
}

function dateTime(row: Row, dateKey = "date") {
  const date = str(row[dateKey]).slice(0, 10);
  if (!date) return "";
  const time = timeFromPaidAt(str(row.paid_at) || null);
  return [formatDate(date), time].filter(Boolean).join(", ");
}

const TX_KIND: Record<string, string> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
};

export function summarizeChange(
  entityType: SyncEntityType,
  row: Row,
  lookup: NameLookup,
): ChangeSummary {
  switch (entityType) {
    case "transaction": {
      const type = str(row.type);
      const from = str(row.source_name) || accountName(lookup, row.source_container_id);
      const to = str(row.destination_name) || accountName(lookup, row.destination_container_id);
      const category =
        str(row.category_name) || lookup.categories.get(str(row.category_id)) || "";
      return {
        kind: TX_KIND[type] || "Transaction",
        title: str(row.description) || str(row.merchant) || "Untitled entry",
        amount: {
          text: `${type === "income" ? "+" : type === "expense" ? "−" : ""}${money(lookup, row)}`,
          tone: type === "income" ? "in" : type === "expense" ? "out" : "neutral",
        },
        when: dateTime(row),
        where:
          type === "transfer"
            ? `${from || "—"} → ${to || "—"}`
            : [type === "income" ? to && `Into ${to}` : from && `From ${from}`, category]
                .filter(Boolean)
                .join(" · "),
      };
    }
    case "account":
      return {
        kind: "Account",
        title: str(row.name) || "Account",
        amount: { text: money(lookup, { ...row, amount: row.balance }), tone: "neutral" },
      };
    case "budget":
      return {
        kind: "Budget",
        title: str(row.name) || "Budget",
        amount: { text: `${money(lookup, row)} / ${str(row.period_type) || "month"}`, tone: "neutral" },
        where: lookup.categories.get(str(row.category_id)) || undefined,
      };
    case "goal":
      return {
        kind: "Goal",
        title: str(row.name) || "Goal",
        amount: { text: `Target ${money(lookup, row, "target_amount")}`, tone: "neutral" },
      };
    case "recurring":
      return {
        kind: "Recurring schedule",
        title: str(row.name) || "Schedule",
        amount: { text: money(lookup, row), tone: "neutral" },
        when: row.next_execution ? `Next ${formatDate(str(row.next_execution))}` : undefined,
      };
    case "loan":
      return {
        kind: "Loan",
        title: str(row.name) || "Loan",
        amount: { text: money(lookup, row, "principal"), tone: "neutral" },
      };
    case "category":
      return { kind: "Category", title: str(row.name) || "Category" };
    case "investment":
      return { kind: "Investment", title: str(row.name) || "Holding" };
    case "goal_contribute":
      return {
        kind: "Goal contribution",
        title: lookup.names.get(str(row.goal_id ?? row.id)) || "Goal",
        amount: { text: money(lookup, row), tone: "neutral" },
      };
    case "loan_payment":
      return {
        kind: "Loan payment",
        title: lookup.names.get(str(row.loan_id ?? row.id)) || "Loan",
        amount: { text: `−${money(lookup, row)}`, tone: "out" },
        when: dateTime(row),
        where: accountName(lookup, row.source_container_id) || undefined,
      };
    case "recurring_execute":
      return {
        kind: "Post recurring entry",
        title: lookup.names.get(str(row.id)) || "Scheduled transaction",
      };
    default:
      return { kind: "Settings", title: "Your settings" };
  }
}

export function opWording(op: OutboxOp | undefined) {
  if (op === "create") return "New";
  if (op === "delete") return "Deleting";
  return "Edit";
}

type Field = { key: string; label: string; show: (row: Row) => string };

function fieldsFor(entityType: SyncEntityType, lookup: NameLookup): Field[] {
  const amount = (key: string): Field["show"] => (row) =>
    row[key] == null ? "" : money(lookup, row, key);
  const date = (key: string): Field["show"] => (row) =>
    row[key] ? formatDate(str(row[key]).slice(0, 10)) : "";
  const plain = (key: string): Field["show"] => (row) => str(row[key]);
  const account = (key: string): Field["show"] => (row) => accountName(lookup, row[key]);
  const category: Field["show"] = (row) =>
    row.category_id ? lookup.categories.get(str(row.category_id)) || "a deleted category" : "None";

  switch (entityType) {
    case "transaction":
      return [
        { key: "description", label: "Name", show: plain("description") },
        { key: "amount", label: "Amount", show: amount("amount") },
        { key: "type", label: "Type", show: (r) => TX_KIND[str(r.type)] || str(r.type) },
        { key: "date", label: "Date", show: date("date") },
        { key: "paid_at", label: "Time", show: (r) => timeFromPaidAt(str(r.paid_at) || null) },
        { key: "source_container_id", label: "From", show: account("source_container_id") },
        { key: "destination_container_id", label: "To", show: account("destination_container_id") },
        { key: "category_id", label: "Category", show: category },
        { key: "merchant", label: "Merchant", show: plain("merchant") },
        { key: "notes", label: "Notes", show: plain("notes") },
      ];
    case "account":
      return [
        { key: "name", label: "Name", show: plain("name") },
        { key: "balance", label: "Balance", show: amount("balance") },
        { key: "institution", label: "Bank", show: plain("institution") },
      ];
    case "budget":
      return [
        { key: "name", label: "Name", show: plain("name") },
        { key: "amount", label: "Limit", show: amount("amount") },
        { key: "period_type", label: "Period", show: plain("period_type") },
        { key: "category_id", label: "Category", show: category },
      ];
    case "goal":
      return [
        { key: "name", label: "Name", show: plain("name") },
        { key: "target_amount", label: "Target", show: amount("target_amount") },
        { key: "target_date", label: "Target date", show: date("target_date") },
      ];
    case "recurring":
      return [
        { key: "name", label: "Name", show: plain("name") },
        { key: "amount", label: "Amount", show: amount("amount") },
        { key: "frequency", label: "Repeats", show: plain("frequency") },
        { key: "next_execution", label: "Next date", show: date("next_execution") },
        { key: "status", label: "Status", show: plain("status") },
      ];
    case "loan":
      return [
        { key: "name", label: "Name", show: plain("name") },
        { key: "principal", label: "Principal", show: amount("principal") },
        { key: "annual_interest_rate", label: "Interest %", show: plain("annual_interest_rate") },
      ];
    default:
      return [{ key: "name", label: "Name", show: plain("name") }];
  }
}

/** Only the fields that actually differ, both versions in plain words. */
export function diffChange(
  entityType: SyncEntityType,
  mine: Row,
  theirs: Row,
  lookup: NameLookup,
): Array<{ label: string; mine: string; theirs: string }> {
  if (theirs.deleted_at && !mine.deleted_at) {
    return [{ label: "Status", mine: "Kept", theirs: "Deleted" }];
  }
  if (mine.deleted_at && !theirs.deleted_at) {
    return [{ label: "Status", mine: "Deleted", theirs: "Kept" }];
  }
  return fieldsFor(entityType, lookup)
    .map((field) => ({
      label: field.label,
      mine: field.show(mine) || "—",
      theirs: field.show(theirs) || "—",
    }))
    .filter((f) => f.mine !== f.theirs);
}
