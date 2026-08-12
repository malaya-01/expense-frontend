import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BookOpen,
  ChartNoAxesCombined,
  Cloud,
  FileChartColumn,
  Landmark,
  LayoutDashboard,
  Repeat2,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Tags,
  Target,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

export type GuideGroupId = "start" | "money" | "planning" | "insights" | "app";

export type GuideChapter = {
  slug: string;
  title: string;
  summary: string;
  /** Live app route when applicable */
  appHref?: string;
  icon: LucideIcon;
  group: GuideGroupId;
};

export const GUIDE_GROUPS: Array<{ id: GuideGroupId; label: string }> = [
  { id: "start", label: "Start" },
  { id: "money", label: "Money" },
  { id: "planning", label: "Planning" },
  { id: "insights", label: "Insights" },
  { id: "app", label: "App" },
];

export const GUIDE_CHAPTERS: GuideChapter[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    summary: "Sign in, add accounts, log money, and review your twin.",
    icon: BookOpen,
    group: "start",
  },
  {
    slug: "dashboard",
    title: "Dashboard",
    summary: "Home screen for balances, cash flow, and what needs attention.",
    appHref: "/dashboard",
    icon: LayoutDashboard,
    group: "start",
  },
  {
    slug: "accounts",
    title: "Accounts",
    summary: "Containers where money lives — cash, banks, cards, and more.",
    appHref: "/accounts",
    icon: WalletCards,
    group: "money",
  },
  {
    slug: "transactions",
    title: "Transactions",
    summary: "Expenses, income, and transfers that move value between accounts.",
    appHref: "/expenses",
    icon: ArrowLeftRight,
    group: "money",
  },
  {
    slug: "budgets",
    title: "Budgets",
    summary: "Spending caps by category so you stay on track each period.",
    appHref: "/budgets",
    icon: ChartNoAxesCombined,
    group: "planning",
  },
  {
    slug: "goals",
    title: "Goals",
    summary: "Savings targets with progress toward an amount you care about.",
    appHref: "/goals",
    icon: Target,
    group: "planning",
  },
  {
    slug: "recurring",
    title: "Recurring",
    summary: "Rent, salary, and subscriptions that repeat on a schedule.",
    appHref: "/recurring",
    icon: Repeat2,
    group: "planning",
  },
  {
    slug: "loans",
    title: "Loans & debts",
    summary: "Money you owe or are owed — principals, payments, and status.",
    appHref: "/loans",
    icon: Landmark,
    group: "money",
  },
  {
    slug: "investments",
    title: "Investments",
    summary: "Holdings and values kept separate from day-to-day spending.",
    appHref: "/investments",
    icon: TrendingUp,
    group: "money",
  },
  {
    slug: "categories",
    title: "Categories",
    summary: "Labels that organize spending and power budgets and reports.",
    appHref: "/categories",
    icon: Tags,
    group: "planning",
  },
  {
    slug: "spaces",
    title: "Spaces",
    summary: "Shared wallets for family, trips, or group expenses.",
    appHref: "/spaces",
    icon: Users,
    group: "money",
  },
  {
    slug: "reports",
    title: "Reports",
    summary: "Trends and summaries without exporting a spreadsheet first.",
    appHref: "/reports",
    icon: FileChartColumn,
    group: "insights",
  },
  {
    slug: "ai",
    title: "AI Advisor",
    summary: "Ask questions about your twin; confirm proposed actions yourself.",
    appHref: "/ai",
    icon: Sparkles,
    group: "insights",
  },
  {
    slug: "offline-sync",
    title: "Offline & sync",
    summary: "Work without a network; sync when you are back online.",
    appHref: "/settings?section=sync",
    icon: Cloud,
    group: "app",
  },
  {
    slug: "mobile",
    title: "Mobile app",
    summary: "The same Opal experience in the Android shell.",
    icon: Smartphone,
    group: "app",
  },
  {
    slug: "settings",
    title: "Settings",
    summary: "Profile, appearance, AI keys, security, backup, and sync.",
    appHref: "/settings",
    icon: Settings,
    group: "app",
  },
  {
    slug: "admin",
    title: "Admin",
    summary: "Users and module permissions for your workspace.",
    appHref: "/admin",
    icon: Shield,
    group: "app",
  },
  {
    slug: "tips",
    title: "Tips & shortcuts",
    summary: "Keyboard shortcuts and habits that keep balances honest.",
    icon: BookOpen,
    group: "app",
  },
];

export function getGuideChapter(slug: string): GuideChapter | undefined {
  return GUIDE_CHAPTERS.find((chapter) => chapter.slug === slug);
}

export function getGuideNeighbors(slug: string): {
  prev: GuideChapter | null;
  next: GuideChapter | null;
  index: number;
} {
  const index = GUIDE_CHAPTERS.findIndex((chapter) => chapter.slug === slug);
  if (index < 0) return { prev: null, next: null, index: -1 };
  return {
    index,
    prev: index > 0 ? GUIDE_CHAPTERS[index - 1] : null,
    next: index < GUIDE_CHAPTERS.length - 1 ? GUIDE_CHAPTERS[index + 1] : null,
  };
}

export function isGuideSlug(slug: string): boolean {
  return GUIDE_CHAPTERS.some((chapter) => chapter.slug === slug);
}
