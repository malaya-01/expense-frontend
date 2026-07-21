import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

/**
 * Post-login workspace picker — Expense Tracker vs Journal (separate apps).
 *
 * TODO: After sign-in, redirect here instead of /expense.
 * TODO: Remember last choice in localStorage → auto-redirect on return visit.
 * TODO: Only show both if user has access to both products (subscription/role).
 */
export default function ChooseAppPage() {
  return (
    <div className="chooser-page">
      <header className="absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-violet-600 text-xs text-white">
            ET
          </span>
          Workspace
        </Link>
        <ThemeToggle />
      </header>

      <main className="w-full max-w-3xl text-center">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
          Welcome back
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Choose your workspace
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Finance and journaling live in separate apps. Pick one to continue — you can switch anytime.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {/* Expense Tracker */}
          <Link href="/expense" className="chooser-card chooser-card-expense group text-left">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-emerald-500/15 text-2xl">
              💰
            </div>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
              Expense Tracker
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Ledger, salary, bank accounts, budgets, monthly funds, assets, and auto reports for professionals.
            </p>
            <ul className="mt-4 space-y-1 text-left text-[11px] text-slate-600 dark:text-slate-400">
              <li>· Personal finance &amp; expense tracking</li>
              <li>· Monthly fund allocation from salary</li>
              <li>· Net worth &amp; asset division</li>
            </ul>
            <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Open finance app
              <svg className="size-4 transition group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </Link>

          {/* Journal */}
          <Link href="/journal" className="chooser-card chooser-card-journal group text-left">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-violet-500/15 text-2xl">
              📓
            </div>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-400">
              Journal
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Notion-style workspace for notes, goals, tasks, habits, projects, databases, and daily reflection.
            </p>
            <ul className="mt-4 space-y-1 text-left text-[11px] text-slate-600 dark:text-slate-400">
              <li>· Block editor &amp; linked pages</li>
              <li>· Goals, habits &amp; kanban boards</li>
              <li>· Meeting notes &amp; mood tracking</li>
            </ul>
            <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400">
              Open journal app
              <svg className="size-4 transition group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </Link>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          {/* TODO: Show "Continue as guest" or org switcher for multi-tenant */}
          Signed in as <span className="font-medium text-slate-600 dark:text-slate-300">jane@example.com</span>
        </p>
      </main>
    </div>
  );
}
