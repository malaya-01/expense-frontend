/** Frontend mirror of backend AI slash (/) and mention (@) catalog. */

export type AiAtToolDef = {
  id: string;
  tool: string;
  label: string;
  description: string;
  href?: string;
};

export type AiSlashCommandDef = {
  id: string;
  command: string;
  label: string;
  description: string;
  prompt: string;
  tools: string[];
  web_search?: boolean;
};

export const AI_AT_TOOLS: AiAtToolDef[] = [
  {
    id: "accounts",
    tool: "list_accounts",
    label: "Accounts",
    description: "Balances and financial containers",
  },
  {
    id: "transactions",
    tool: "list_transactions",
    label: "Transactions",
    description: "Recent ledger activity",
  },
  {
    id: "budgets",
    tool: "list_budgets",
    label: "Budgets",
    description: "Envelopes and limits",
  },
  {
    id: "goals",
    tool: "list_goals",
    label: "Goals",
    description: "Savings targets and progress",
  },
  {
    id: "investments",
    tool: "list_investments",
    label: "Investments",
    description: "Holdings and positions",
  },
  {
    id: "loans",
    tool: "list_loans",
    label: "Loans",
    description: "Debt plans and EMIs",
  },
  {
    id: "recurring",
    tool: "list_recurring",
    label: "Recurring",
    description: "Subscriptions and schedules",
  },
  {
    id: "categories",
    tool: "list_categories",
    label: "Categories",
    description: "Spend taxonomy",
  },
  {
    id: "overview",
    tool: "get_financial_overview",
    label: "Twin overview",
    description: "Net worth, cash flow, health snapshot",
  },
  {
    id: "uncategorized",
    tool: "list_uncategorized",
    label: "Uncategorized",
    description: "Transactions missing a category",
  },
  {
    id: "cashflow",
    tool: "get_cash_flow",
    label: "Cash flow",
    description: "Income vs expense trends",
  },
  {
    id: "scenario",
    tool: "simulate_scenario",
    label: "Scenario",
    description: "What-if savings projection",
  },
  {
    id: "web",
    tool: "search_public_web",
    label: "Web",
    description: "Current public sources",
  },
];

export const AI_SLASH_COMMANDS: AiSlashCommandDef[] = [
  {
    id: "spend",
    command: "/spend",
    label: "Analyze spending",
    description: "Find leaks and unusual expenses",
    prompt:
      "Analyze my recent spending. Highlight unusual merchants, category drift, and 2–3 concrete cuts I can make this month.",
    tools: [
      "list_transactions",
      "list_budgets",
      "list_categories",
      "get_cash_flow",
    ],
  },
  {
    id: "budget",
    command: "/budget",
    label: "Build budget",
    description: "Propose a monthly plan",
    prompt:
      "Build a practical monthly budget from my twin data and propose create_budget / update_budget actions I can confirm.",
    tools: [
      "list_budgets",
      "list_transactions",
      "list_categories",
      "get_cash_flow",
    ],
  },
  {
    id: "goal",
    command: "/goal",
    label: "Set a goal",
    description: "Savings target with a plan",
    prompt:
      "Help me set a realistic savings goal for the next 90 days and propose a create_goal action I can confirm.",
    tools: [
      "list_goals",
      "list_accounts",
      "get_cash_flow",
      "get_financial_overview",
    ],
  },
  {
    id: "health",
    command: "/health",
    label: "Financial health",
    description: "Score drivers and next fixes",
    prompt:
      "Give me a financial health readout: liquidity, savings rate, debt pressure, budget discipline, and investments. Rank the top risks and give one fix each.",
    tools: [
      "get_financial_overview",
      "list_loans",
      "list_budgets",
      "list_goals",
      "list_investments",
      "get_cash_flow",
    ],
  },
  {
    id: "scenario",
    command: "/scenario",
    label: "What-if scenario",
    description: "Project a spending cut or extra savings",
    prompt:
      "Run a what-if scenario: if I cut discretionary spending by 20% and add ₹5,000/month to savings, what changes over 6 and 12 months? Use simulate_scenario numbers and explain tradeoffs.",
    tools: [
      "simulate_scenario",
      "get_cash_flow",
      "list_goals",
      "get_financial_overview",
    ],
  },
  {
    id: "receipt",
    command: "/receipt",
    label: "Log a receipt",
    description: "OCR extract → confirm transaction",
    prompt:
      "I will attach a receipt, bill, or statement image/PDF. Use OCR-style extraction: merchant, date, line items, total amount, currency, tax, and payment method if visible. Match or propose create_category when needed. Then propose create_transaction with every field you can fill from the document and my twin (accounts + categories). If the paying account/container (source_container_id for expenses) or destination is not in the document, list my accounts and ask which one to use before proposing — do not invent container IDs. Ask only for missing required fields.",
    tools: ["list_accounts", "list_categories"],
  },
  {
    id: "categories",
    command: "/categories",
    label: "Seed categories",
    description: "Propose a full expense taxonomy",
    prompt:
      "Review my existing categories. Propose create_category actions for a complete personal-finance taxonomy suitable for FinOS (at least 15 detailed categories covering income, housing, food, transport, utilities, health, shopping, entertainment, subscriptions, travel, education, insurance, debt, savings/transfers, and miscellaneous). Skip names that already exist. Each proposal needs name, description, and an optional color/icon. Do not invent parent_id unless that parent already exists in my twin.",
    tools: ["list_categories"],
  },
  {
    id: "categorize",
    command: "/categorize",
    label: "Auto-categorize",
    description: "Label txs; create missing categories",
    prompt:
      "Review uncategorized transactions. If my taxonomy is thin, propose create_category first. Then propose update_transaction with category_id for each uncategorized row (highest confidence first). Never invent category IDs — only use IDs from context or ask me to confirm category proposals first.",
    tools: ["list_uncategorized", "list_categories", "list_transactions"],
  },
  {
    id: "subscriptions",
    command: "/subscriptions",
    label: "Subscription creep",
    description: "Find recurring charges to review",
    prompt:
      "Analyze my recurring schedules and recent merchant repeats for subscription creep. Flag what to keep, pause, or cancel, and propose create_recurring / update_recurring only when helpful.",
    tools: ["list_recurring", "list_transactions", "get_cash_flow"],
  },
  {
    id: "loans",
    command: "/loans",
    label: "Debt review",
    description: "EMI pressure and payoff ideas",
    prompt:
      "Review my loans and liability pressure. Summarize EMIs, remaining principal, and the smartest next payoff move. Propose create_loan or update_loan only if I ask to change a plan.",
    tools: [
      "list_loans",
      "list_accounts",
      "get_financial_overview",
      "get_cash_flow",
    ],
  },
  {
    id: "web",
    command: "/web",
    label: "Web search",
    description: "Ground the next answer in public sources",
    prompt: "Use current public web sources for anything time-sensitive in my question.",
    tools: ["search_public_web"],
    web_search: true,
  },
];

export function detectCommandTrigger(value: string, caret: number) {
  const before = value.slice(0, caret);
  const atMatch = before.match(/(^|\s)@([a-z0-9_-]*)$/i);
  if (atMatch) {
    return {
      kind: "at" as const,
      query: atMatch[2].toLowerCase(),
      start: caret - atMatch[2].length - 1,
      end: caret,
    };
  }
  const slashMatch = before.match(/(^|\s)\/([a-z0-9_-]*)$/i);
  if (slashMatch) {
    return {
      kind: "slash" as const,
      query: slashMatch[2].toLowerCase(),
      start: caret - slashMatch[2].length - 1,
      end: caret,
    };
  }
  return null;
}

export function parseInvokedToolsFromText(content: string): string[] {
  const found = new Set<string>();
  const re = /@([a-z][a-z0-9_-]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content))) {
    const id = match[1].toLowerCase();
    const def = AI_AT_TOOLS.find((t) => t.id === id || t.tool === id);
    if (def) found.add(def.tool);
  }
  const slash = content.trim().match(/^\/([a-z][a-z0-9_-]*)\b/i);
  if (slash) {
    const key = `/${slash[1].toLowerCase()}`;
    const cmd = AI_SLASH_COMMANDS.find((c) => c.command === key);
    cmd?.tools.forEach((t) => found.add(t));
  }
  return [...found];
}
