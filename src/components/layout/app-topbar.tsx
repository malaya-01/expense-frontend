"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  ChevronDown,
  FileChartColumn,
  LayoutDashboard,
  Landmark,
  Menu,
  Plus,
  Repeat2,
  Search,
  Settings,
  Sparkles,
  Tags,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { openCommandPalette } from "@/components/layout/command-palette";
import { NotificationCenter } from "@/components/layout/notification-center";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  setMobileNavOpen,
  toggleSidebarPinned,
} from "@/lib/store/slices/uiSlice";

const ROUTE_TITLES = [
  { route: "/dashboard", title: "Dashboard", icon: LayoutDashboard },
  { route: "/accounts", title: "Accounts", icon: WalletCards },
  { route: "/expenses/new", title: "New transaction", icon: Plus },
  { route: "/expenses", title: "Transactions", icon: ArrowLeftRight },
  { route: "/recurring", title: "Recurring", icon: Repeat2 },
  { route: "/investments", title: "Investments", icon: TrendingUp },
  { route: "/loans", title: "Loans & Debts", icon: Landmark },
  { route: "/budgets", title: "Budgets", icon: ChartNoAxesCombined },
  { route: "/goals", title: "Goals", icon: Target },
  { route: "/reports", title: "Reports", icon: FileChartColumn },
  { route: "/ai", title: "AI Advisor", icon: Sparkles },
  { route: "/categories", title: "Categories", icon: Tags },
  { route: "/settings", title: "Settings", icon: Settings },
] as const;

export function AppTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarPinned = useAppSelector((state) => state.ui.sidebarPinned);
  const page = useMemo(
    () =>
      ROUTE_TITLES.find(({ route }) => pathname.startsWith(route)) || {
        route: "/dashboard",
        title: "FinOS",
        icon: LayoutDashboard,
      },
    [pathname],
  );
  const PageIcon = page.icon;
  const showTransactionAction =
    pathname === "/dashboard" || pathname === "/expenses";

  return (
    <header className="fixed inset-x-0 top-0 z-[70] flex h-11 items-center gap-1 border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] bg-[var(--ds-background-100)] px-2">
      <button
        type="button"
        onClick={() => dispatch(setMobileNavOpen(true))}
        className="flex size-7 items-center justify-center rounded-[6px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] md:hidden ds-focus"
        aria-label="Open sidebar"
      >
        <Menu size={15} />
      </button>
      <button
        type="button"
        onClick={() => dispatch(toggleSidebarPinned())}
        className="hidden size-7 items-center justify-center rounded-[6px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] md:flex ds-focus"
        aria-label={sidebarPinned ? "Hide sidebar" : "Show sidebar"}
        title={sidebarPinned ? "Hide sidebar (Ctrl+\\)" : "Show sidebar (Ctrl+\\)"}
      >
        <Menu size={15} />
      </button>

      <div className="ml-1 flex min-w-0 items-center gap-1.5 text-[12px]">
        <PageIcon
          size={14}
          className="shrink-0 text-[var(--ds-focus-color)]"
        />
        <span className="truncate font-medium text-[var(--ds-gray-1000)]">
          {page.title}
        </span>
        <button
          type="button"
          onClick={() => router.push("/settings?section=security")}
          className="hidden items-center gap-0.5 rounded-[5px] px-1 py-0.5 text-[10px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] sm:flex ds-focus"
          title="Open privacy and security settings"
        >
          Private
          <ChevronDown size={11} />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-0.5">
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex size-7 items-center justify-center rounded-[6px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
          aria-label="Search FinOS"
          title="Search (Ctrl+K)"
        >
          <Search size={14} />
        </button>
        <NotificationCenter />
        {showTransactionAction ? (
          <button
            type="button"
            onClick={() => router.push("/expenses/new")}
            className="hidden h-7 items-center gap-1 rounded-[6px] bg-[var(--ds-focus-color)] px-2.5 text-[11px] font-medium text-white hover:brightness-95 sm:flex ds-focus"
          >
            <Plus size={13} />
            New transaction
          </button>
        ) : null}
      </div>
    </header>
  );
}
