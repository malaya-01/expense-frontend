export type ApiResponse<T> = {
  status: "Success" | "Error";
  message?: string;
  statusCode: number;
  data: T;
};

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  country?: string | null;
  currency?: string;
  timezone?: string;
  locale?: string;
  avatar_url?: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  user?: User;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  is_system?: boolean;
  budget_amount?: number | null;
  budget_period?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Expense = {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  date: string;
  time?: string | null;
  category_id?: string | null;
  merchant?: string | null;
  payment_method?: string | null;
  currency?: string;
  notes?: string | null;
  is_recurring?: boolean;
  created_at: string;
  updated_at: string;
};

export type TransactionType = "expense" | "income" | "transfer";

export type LedgerTransaction = {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  category_id?: string | null;
  source_container_id?: string | null;
  destination_container_id?: string | null;
  merchant?: string | null;
  currency?: string;
  exchange_rate?: number;
  fx_rate_to_base?: number;
  amount_base?: number;
  notes?: string | null;
  source_name?: string | null;
  source_currency?: string | null;
  destination_name?: string | null;
  destination_currency?: string | null;
  category_name?: string | null;
  created_at: string;
  updated_at: string;
};

export type LedgerJournalLine = {
  id: string;
  sequence_number: number;
  container_id?: string | null;
  container_name?: string | null;
  account_code?: string | null;
  debit_base: number;
  credit_base: number;
  native_amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
};

export type LedgerJournal = {
  id: string;
  transaction_id: string;
  reversal_of_journal_id?: string | null;
  description: string;
  source_module: string;
  correlation_id: string;
  status: "posted" | "reversed";
  posted_at: string;
  lines: LedgerJournalLine[];
};

export type CreateExpenseInput = {
  amount: number;
  description: string;
  date: string;
  time?: string;
  category_id?: string;
  merchant?: string;
  payment_method?: string;
  currency?: string;
  notes?: string;
  is_recurring?: boolean;
};

export type CreateTransactionInput = {
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  category_id?: string;
  source_container_id?: string;
  destination_container_id?: string;
  merchant?: string;
  currency?: string;
  exchange_rate?: number;
  notes?: string;
};

export type CreateCategoryInput = {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  budget_amount?: number;
  budget_period?: string;
};

/** FinOS Financial Container — any place value lives */
export type ContainerType =
  | "cash"
  | "wallet"
  | "bank"
  | "credit_card"
  | "investment"
  | "gold"
  | "crypto"
  | "loan"
  | "receivable"
  | "payable"
  | "other";

export type FinancialContainer = {
  id: string;
  user_id: string;
  name: string;
  type: ContainerType;
  /** Current balance. For liabilities, outstanding amount owed (positive). */
  balance: number;
  currency: string;
  institution?: string | null;
  color?: string | null;
  notes?: string | null;
  include_in_net_worth: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateContainerInput = {
  name: string;
  type: ContainerType;
  balance: number;
  currency: string;
  institution?: string;
  color?: string;
  notes?: string;
  include_in_net_worth?: boolean;
};

export type Loan = {
  id: string;
  user_id: string;
  container_id: string;
  container_name: string;
  container_type: "loan" | "credit_card" | "payable";
  name: string;
  lender?: string | null;
  principal: number;
  annual_interest_rate: number;
  interest_type: "fixed" | "floating" | "simple" | "compound";
  term_months: number;
  start_date: string;
  payment_day?: number | null;
  status: "active" | "paused" | "closed" | "archived";
  notes?: string | null;
  currency: string;
  outstanding_balance: number;
  monthly_payment: number;
  paid_amount: number;
  payoff_percent: number;
  estimated_months_remaining?: number | null;
  created_at: string;
  updated_at: string;
};

export type CreateLoanInput = {
  container_id: string;
  name: string;
  lender?: string;
  principal: number;
  annual_interest_rate: number;
  interest_type?: Loan["interest_type"];
  term_months: number;
  start_date: string;
  payment_day?: number;
  notes?: string;
};

export type LoanAmortizationRow = {
  installment: number;
  due_date: string;
  payment: number;
  principal: number;
  interest: number;
  outstanding_balance: number;
};

export type RecurringSchedule = {
  id: string;
  user_id: string;
  name: string;
  transaction_type: TransactionType;
  amount: number;
  description: string;
  category_id?: string | null;
  category_name?: string | null;
  source_container_id?: string | null;
  source_name?: string | null;
  destination_container_id?: string | null;
  destination_name?: string | null;
  currency?: string | null;
  exchange_rate?: number | null;
  frequency:
    | "daily"
    | "weekly"
    | "biweekly"
    | "monthly"
    | "quarterly"
    | "semiannual"
    | "annual";
  start_date: string;
  end_date?: string | null;
  next_execution: string;
  execution_mode: "review" | "automatic";
  status: "draft" | "active" | "paused" | "completed" | "archived";
  notes?: string | null;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateRecurringScheduleInput = {
  name: string;
  transaction_type: TransactionType;
  amount: number;
  description: string;
  category_id?: string;
  source_container_id?: string;
  destination_container_id?: string;
  currency?: string;
  exchange_rate?: number;
  frequency: RecurringSchedule["frequency"];
  start_date: string;
  end_date?: string;
  execution_mode?: RecurringSchedule["execution_mode"];
  notes?: string;
};

export type BudgetPeriod = "weekly" | "monthly" | "yearly";
export type BudgetStatus = "on_track" | "warning" | "over";

export type Budget = {
  id: string;
  user_id: string;
  category_id?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  name: string;
  amount: number;
  currency: string;
  period_type: BudgetPeriod;
  notes?: string | null;
  period_start: string;
  period_end: string;
  spent: number;
  remaining: number;
  percent: number;
  status: BudgetStatus;
  created_at: string;
  updated_at: string;
};

export type CreateBudgetInput = {
  name: string;
  amount: number;
  period_type?: BudgetPeriod;
  category_id?: string;
  currency?: string;
  notes?: string;
};

export type GoalType =
  | "emergency_fund"
  | "vacation"
  | "house"
  | "marriage"
  | "education"
  | "retirement"
  | "vehicle"
  | "business"
  | "other";

export type GoalStatus = "on_track" | "behind" | "achieved" | "at_risk";

export type Goal = {
  id: string;
  user_id: string;
  container_id?: string | null;
  container_name?: string | null;
  name: string;
  goal_type: GoalType;
  target_amount: number;
  current_amount: number;
  stored_current_amount?: number;
  currency: string;
  target_date?: string | null;
  notes?: string | null;
  remaining: number;
  percent: number;
  status: GoalStatus;
  progress_source: "manual" | "container";
  monthly_surplus: number;
  predicted_date?: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateGoalInput = {
  name: string;
  goal_type?: GoalType;
  target_amount: number;
  current_amount?: number;
  currency?: string;
  target_date?: string | null;
  container_id?: string | null;
  notes?: string;
};

export type AssetType =
  | "stock"
  | "mutual_fund"
  | "etf"
  | "gold"
  | "crypto"
  | "bond"
  | "real_estate"
  | "other";

export type InvestmentHolding = {
  id: string;
  user_id: string;
  container_id?: string | null;
  container_name?: string | null;
  container_type?: string | null;
  name: string;
  symbol?: string | null;
  asset_type: AssetType;
  quantity: number;
  avg_cost: number;
  current_price: number;
  currency: string;
  notes?: string | null;
  cost_basis: number;
  market_value: number;
  gain: number;
  gain_percent: number;
  market_value_base: number;
  cost_basis_base: number;
  base_currency: string;
  created_at: string;
  updated_at: string;
};

export type InvestmentAllocation = {
  asset_type: string;
  value: number;
  percent: number;
};

export type InvestmentSummary = {
  base_currency: string;
  holding_count: number;
  total_value: number;
  total_cost: number;
  total_gain: number;
  gain_percent: number;
  allocation: InvestmentAllocation[];
};

export type InvestmentsPayload = {
  holdings: InvestmentHolding[];
  summary: InvestmentSummary;
};

export type CreateInvestmentInput = {
  name: string;
  symbol?: string;
  asset_type?: AssetType;
  quantity: number;
  avg_cost: number;
  current_price: number;
  currency?: string;
  container_id?: string | null;
  notes?: string;
};

export type ReportCashFlowMonth = {
  month: string;
  income: number;
  expense: number;
  net: number;
};

export type ReportCategorySpend = {
  category_id: string;
  category_name: string;
  category_color?: string | null;
  amount: number;
  percent: number;
};

export type ReportBudgetItem = {
  id: string;
  name: string;
  category_name?: string | null;
  period_type: string;
  amount: number;
  spent: number;
  remaining: number;
  percent: number;
  status: "on_track" | "warning" | "over";
};

export type ReportOverview = {
  base_currency: string;
  months: number;
  generated_at: string;
  twin: {
    container_count: number;
    assets: number;
    liabilities: number;
    net_worth: number;
    cash: number;
    investments: number;
  };
  cash_flow: ReportCashFlowMonth[];
  spending_by_category: ReportCategorySpend[];
  budgets: {
    items: ReportBudgetItem[];
    total_budget: number;
    total_spent: number;
    remaining: number;
    over_count: number;
  };
  investments: {
    holding_count: number;
    total_value: number;
    total_cost: number;
    total_gain: number;
    gain_percent: number;
    allocation: Array<{
      asset_type: string;
      value: number;
      percent: number;
    }>;
  };
  top_merchants: Array<{
    merchant: string;
    amount: number;
    tx_count: number;
  }>;
  this_month: {
    income: number;
    expense: number;
    net: number;
    savings_rate: number;
  };
};

export type AiProviderId = "openai" | "anthropic" | "local" | "vertex";

export type AiSetupGuide = {
  title: string;
  summary: string;
  steps: string[];
  links: Array<{ label: string; href: string }>;
};

export type AiProviderConfigPublic = {
  id?: string;
  provider: AiProviderId;
  connected: boolean;
  display_name?: string | null;
  model?: string | null;
  base_url?: string | null;
  project_id?: string | null;
  location?: string | null;
  credentials_meta?: {
    api_key_masked?: string | null;
    has_api_key?: boolean;
    has_service_account?: boolean;
    service_account_email?: string | null;
  };
  last_tested_at?: string | null;
  last_test_status?: string | null;
  last_test_message?: string | null;
  default_models?: string[];
  setup?: AiSetupGuide;
};

export type AiSettings = {
  encryption_ready: boolean;
  active_provider: AiProviderId | null;
  active_model: string | null;
  master_prompt: string;
  master_prompt_default: string;
  safety_layer_preview: string;
  prompt_version: string;
  providers: AiProviderConfigPublic[];
  setup_guides: Record<AiProviderId, AiSetupGuide>;
};

export type AiCitation = {
  label: string;
  href: string;
  snippet?: string;
  domain?: string;
  image_url?: string;
  source_type?: "module" | "web";
};
export type AiToolActivity = {
  name: string;
  status: "ok" | "error";
  summary: string;
};

export type AiActionProposal = {
  id: string;
  conversation_id?: string | null;
  action_type: string;
  title: string;
  summary?: string | null;
  payload: Record<string, unknown>;
  status: "pending" | "confirmed" | "rejected" | "expired" | "failed";
  expires_at: string;
  result?: unknown;
  created_at: string;
};

export type AiMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  attachments?: AiAttachment[];
  tool_activity?: AiToolActivity[];
  citations?: AiCitation[];
  proposal_ids?: string[];
  provider?: string | null;
  model?: string | null;
  created_at: string;
};

export type AiAttachment = {
  name: string;
  mime_type: string;
  data_base64?: string;
};

export type AiConversation = {
  id: string;
  title: string;
  provider?: string | null;
  model?: string | null;
  pinned_at?: string | null;
  archived_at?: string | null;
  last_message_preview?: string | null;
  created_at: string;
  updated_at: string;
};

export type AiDocumentSection = {
  title: string;
  content: string;
};

export type AiDocument = {
  id: string;
  conversation_id?: string | null;
  name: string;
  mime_type: string;
  size_bytes: number;
  detected_type?: string | null;
  summary?: string | null;
  analysis_confidence?: number | string | null;
  extracted_sections?: AiDocumentSection[];
  suggested_actions?: string[];
  related_accounts?: string[];
  related_transactions?: Array<Record<string, unknown>>;
  status: "uploading" | "analyzing" | "ready" | "failed";
  analysis_error?: string | null;
  data_base64?: string;
  created_at: string;
  updated_at: string;
};

export type AiMemory = {
  id: string;
  content: string;
  source: "user" | "conversation";
  source_conversation_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type AiChatResponse = {
  conversation_id: string;
  message: AiMessage;
  proposals: AiActionProposal[];
  provider: string;
  model: string;
  tool_activity: AiToolActivity[];
  citations: AiCitation[];
  suggested_questions: string[];
};

