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

