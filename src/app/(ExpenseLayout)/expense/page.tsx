import Link from "next/link";
import { ExpensePageHeader } from "../_components/ExpensePageHeader";
import { ExpenseShell } from "../_components/ExpenseShell";

export default function ExpenseHomePage() {
  return (
    <ExpenseShell activeNav="home" headerTitle="Home">
      <ExpensePageHeader title="Good afternoon, Jane" subtitle="Your personal finance workspace">
        <Link href="/expense/expenses" className="dash-btn-primary">
          Add expense
        </Link>
      </ExpensePageHeader>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/expense/dashboard" className="dash-card hover:border-emerald-300 dark:hover:border-emerald-700">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Overview</p>
          <p className="mt-1 text-sm font-semibold">Financial dashboard</p>
          <p className="mt-1 font-mono text-[10px] text-slate-400">Net worth $24,680</p>
        </Link>
        <Link href="/expense/ledger" className="dash-card">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Ledger</p>
          <p className="mt-1 text-sm font-semibold">3 entries this week</p>
        </Link>
        <Link href="/expense/budgets" className="dash-card">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Budgets</p>
          <p className="mt-1 text-sm font-semibold">4 categories on track</p>
        </Link>
        <Link href="/expense/goals" className="dash-card">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Goals</p>
          <p className="mt-1 text-sm font-semibold">Emergency fund · 62%</p>
        </Link>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="dash-card">
          <h2 className="text-xs font-bold">Quick links</h2>
          <ul className="mt-3 space-y-1">
            <li>
              <Link href="/expense/funds" className="flex justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-white/[0.04]">
                <span>Monthly funds</span>
                <span className="text-slate-400">→</span>
              </Link>
            </li>
            <li>
              <Link href="/expense/salary" className="flex justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-white/[0.04]">
                <span>Salary</span>
                <span className="text-slate-400">→</span>
              </Link>
            </li>
            <li>
              <Link href="/expense/reports" className="flex justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-white/[0.04]">
                <span>Auto reports</span>
                <span className="text-slate-400">→</span>
              </Link>
            </li>
          </ul>
        </section>
        <section className="dash-card">
          <h2 className="text-xs font-bold">Recent activity</h2>
          {/* TODO: GET /expense/activity — last 5 transactions */}
          <p className="mt-3 text-xs text-slate-400">Groceries · May 28 · $84.20</p>
          <p className="mt-1 text-xs text-slate-400">Salary deposit · May 25 · $4,200</p>
          <Link href="/expense/dashboard" className="mt-3 inline-block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            Open dashboard →
          </Link>
        </section>
      </div>
    </ExpenseShell>
  );
}
