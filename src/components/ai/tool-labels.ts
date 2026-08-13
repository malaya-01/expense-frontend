import type { AiToolActivity } from "@/types";

const TOOL_LABELS: Record<string, string> = {
  get_financial_overview: "Financial Twin",
  list_accounts: "Accounts",
  list_transactions: "Transactions",
  list_budgets: "Budgets",
  list_goals: "Goals",
  list_investments: "Investments",
  list_holdings: "Investments",
  list_expenses: "Expenses",
  list_recurring: "Recurring payments",
  list_loans: "Loans",
  list_categories: "Categories",
  list_uncategorized: "Uncategorized",
  get_cash_flow: "Cash flow",
  simulate_scenario: "Scenario",
  search_public_web: "Live web sources",
};

const ROTATING_OPAL_STATUS = [
  "Opening your Financial Twin…",
  "Asking Groq…",
  "Opal Advisor is thinking…",
  "Drafting a clear next step…",
];

export function humanizeToolName(name: string) {
  if (TOOL_LABELS[name]) return TOOL_LABELS[name];
  return name
    .replace(/^(get|list|load|fetch)_/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function connectedSources(activity?: AiToolActivity[]) {
  const labels = (activity || [])
    .filter((tool) => tool.status !== "error")
    .map((tool) => humanizeToolName(tool.name));
  return [...new Set(labels)];
}

export function toolActivityLabel(tool: AiToolActivity) {
  const label = humanizeToolName(tool.name);
  if (tool.status === "error") return `${label} unavailable`;
  if (/twin|overview/i.test(tool.name)) return `${label} loaded`;
  if (/account|budget|goal|investment|holding|transaction|expense|categor/i.test(
    tool.name,
  )) {
    return `${label} connected`;
  }
  return `${label} loaded`;
}

/** Keep live status human and Opal-voiced — never collapse to one stale line. */
export function humanizeAdvisorStatus(message: string) {
  let result = (message || "").trim();
  if (!result) return "Opal Advisor is thinking…";

  for (const [tool, label] of Object.entries(TOOL_LABELS)) {
    result = result.replaceAll(tool, label);
  }

  result = result
    .replace(/\b(calling|executing|running)\b/gi, "Loading")
    .replace(/\btool(s)?\b/gi, "source$1")
    .replace(/\bfunction(s)?\b/gi, "source$1")
    .replace(/\bAPI\b/gi, "data")
    .replace(/\bget[_ ]/gi, "")
    .replace(/\blist[_ ]/gi, "")
    .replace(/\bGenerating reply\b/gi, "Opal Advisor is thinking")
    .replace(
      /\bGenerating personalized response\b/gi,
      "Writing your Opal Advisor reply",
    )
    .replace(/\bLoading provider and twin context\b/gi, "Opening your Financial Twin");

  if (!/[.…]$/.test(result)) result = `${result}…`;
  return result;
}

/** Rotate calming Opal status lines while waiting for the first token. */
export function nextRotatingAdvisorStatus(tick: number) {
  return ROTATING_OPAL_STATUS[tick % ROTATING_OPAL_STATUS.length];
}
