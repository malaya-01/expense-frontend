import type { ComponentType } from "react";
import { GettingStartedGuide } from "./getting-started";
import { DashboardGuide } from "./dashboard";
import { AccountsGuide } from "./accounts";
import { TransactionsGuide } from "./transactions";
import { BudgetsGuide } from "./budgets";
import { GoalsGuide } from "./goals";
import { RecurringGuide } from "./recurring";
import { LoansGuide } from "./loans";
import { InvestmentsGuide } from "./investments";
import { CategoriesGuide } from "./categories";
import { SpacesGuide } from "./spaces";
import { ReportsGuide } from "./reports";
import { AiGuide } from "./ai";
import { OfflineSyncGuide } from "./offline-sync";
import { MobileGuide } from "./mobile";
import { SettingsGuide } from "./settings";
import { AdminGuide } from "./admin";
import { TipsGuide } from "./tips";

export const GUIDE_PAGE_CONTENT: Record<string, ComponentType> = {
  "getting-started": GettingStartedGuide,
  dashboard: DashboardGuide,
  accounts: AccountsGuide,
  transactions: TransactionsGuide,
  budgets: BudgetsGuide,
  goals: GoalsGuide,
  recurring: RecurringGuide,
  loans: LoansGuide,
  investments: InvestmentsGuide,
  categories: CategoriesGuide,
  spaces: SpacesGuide,
  reports: ReportsGuide,
  ai: AiGuide,
  "offline-sync": OfflineSyncGuide,
  mobile: MobileGuide,
  settings: SettingsGuide,
  admin: AdminGuide,
  tips: TipsGuide,
};
