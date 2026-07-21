'use client';
import Link from "next/link";
import { useRouter } from "next/navigation";
/**
 * Collapsible sidebar — pure CSS via #dash-collapse (desktop) + #dash-nav-toggle (mobile).
 *
 * TODO: Replace `active` prop with usePathname() for dynamic highlight.
 * TODO: Persist collapse state in localStorage (client component wrapper).
 * TODO: dash-sidebar-balance → GET /expense/dashboard/net-worth
 */

export type ExpenseNavKey =
  | "home"
  | "dashboard"
  | "ledger"
  | "funds"
  | "salary"
  | "accounts"
  | "assets"
  | "transfers"
  | "recurring"
  | "goals"
  | "expenses"
  | "categories"
  | "budgets"
  | "reports"
  | "insights"
  | "settings";

type ExpenseSidebarProps = {
  active?: ExpenseNavKey;
};

function navClass(active: boolean) {
  return active ? "dash-nav-link dash-nav-link-active" : "dash-nav-link";
}

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-[18px] shrink-0 items-center justify-center [&>svg]:size-[18px]">
      {children}
    </span>
  );
}

export function ExpenseSidebar({ active = "home" }: ExpenseSidebarProps) {
  const router = useRouter();

  const handleSignOut = () => {
    router.push("/signout")
  }

  return (
    <aside className="dash-sidebar">
      <div className="dash-sidebar-header flex h-11 shrink-0 items-center gap-2 border-b border-slate-200/70 px-3 dark:border-white/[0.06]">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 font-mono text-xs font-bold text-white">
          $
        </span>
        <div className="dash-brand-text min-w-0 dash-nav-label">
          <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
            Expense<span className="text-emerald-600 dark:text-emerald-400">Tracker</span>
          </p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400">Pro finance</p>
        </div>
      </div>

      {/* TODO: Live balance from API */}
      <div className="dash-sidebar-balance mx-2 mt-2 rounded-lg bg-emerald-500/10 px-2.5 py-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Net worth</p>
        <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">$24,680</p>
      </div>

      <nav className="dash-sidebar-nav space-y-0.5">
        <p className="dash-nav-section dash-nav-label">Overview</p>
        <Link href="/expense" className={navClass(active === "home")} title="Home">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Home</span>
        </Link>
        <Link href="/expense/dashboard" className={navClass(active === "dashboard")} title="Dashboard">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Dashboard</span>
        </Link>

        <p className="dash-nav-section dash-nav-label">Money core</p>
        <Link href="/expense/ledger" className={navClass(active === "ledger")} title="Ledger">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Ledger</span>
        </Link>
        <Link href="/expense/funds" className={navClass(active === "funds")} title="Monthly funds">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Monthly funds</span>
        </Link>
        <Link href="/expense/salary" className={navClass(active === "salary")} title="Salary">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Salary</span>
        </Link>
        <Link href="/expense/accounts" className={navClass(active === "accounts")} title="Bank accounts">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Bank accounts</span>
        </Link>
        <Link href="/expense/transfers" className={navClass(active === "transfers")} title="Transfers">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Transfers</span>
        </Link>
        <Link href="/expense/assets" className={navClass(active === "assets")} title="Asset division">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Assets</span>
        </Link>

        <p className="dash-nav-section dash-nav-label">Tracking</p>
        <Link href="/expense/expenses" className={navClass(active === "expenses")} title="Expenses">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Expenses</span>
        </Link>
        <Link href="/expense/recurring" className={navClass(active === "recurring")} title="Recurring & bills">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Recurring</span>
        </Link>
        <Link href="/expense/categories" className={navClass(active === "categories")} title="Categories">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Categories</span>
        </Link>
        <Link href="/expense/budgets" className={navClass(active === "budgets")} title="Budgets">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Budgets</span>
        </Link>
        <Link href="/expense/goals" className={navClass(active === "goals")} title="Savings goals">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Goals</span>
        </Link>

        <p className="dash-nav-section dash-nav-label">Reports</p>
        <Link href="/expense/reports" className={navClass(active === "reports")} title="Auto reports">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Auto reports</span>
        </Link>
        <Link href="/expense/insights" className={navClass(active === "insights")} title="AI insights">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">AI insights</span>
          <span className="dash-nav-badge dash-badge dash-badge-amber ml-auto shrink-0">Soon</span>
        </Link>

        <p className="dash-nav-section dash-nav-label">System</p>
        <Link href="/expense/settings" className={navClass(active === "settings")} title="Settings">
          <NavIcon>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </NavIcon>
          <span className="dash-nav-label">Settings</span>
        </Link>
      </nav>

      <div className="dash-sidebar-footer shrink-0 border-t border-slate-200/70 p-2 dark:border-white/[0.06]">
        <div className="dash-sidebar-user flex items-center gap-2 rounded-lg bg-slate-100/80 p-2 dark:bg-white/[0.03]">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/15 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
            JD
          </span>
          <div className="dash-user-meta min-w-0 flex-1 dash-nav-label">
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">Jane Doe</p>
            <p className="truncate text-[10px] text-slate-500">Working professional</p>
          </div>
        </div>
        <Link href="/choose-app" className="dash-btn-ghost mt-1.5 w-full justify-start px-2 text-[10px]" title="Switch workspace">
          <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="dash-nav-label">Switch app</span>
        </Link>
        <Link href="/signout" className="dash-signout-btn dash-btn-ghost mt-1 w-full justify-start px-2" title="Sign out">
          <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="dash-signout-text dash-nav-label">Sign out</span>
        </Link>
      </div>
    </aside>
  );
}
