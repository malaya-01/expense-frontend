import Link from "next/link";
import { ExpensePageHeader } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function BudgetsPage() {
  return (
    <ExpenseShell activeNav="budgets" headerTitle="Budgets">
      <ExpensePageHeader
        title="Budgets"
        subtitle="Set limits and track spending against your goals"
      >
        {/* TODO: CreateBudgetModal → POST /budgets { categoryId, amount, period } */}
        <button type="button" className="dash-btn-primary">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Set budget
        </button>
      </ExpensePageHeader>

      {/* TODO: Fetch from GET /budgets/summary?month=2026-05 */}
      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <article className="dash-stat-card">
          <p className="dash-stat-label">Total budget</p>
          <p className="dash-stat-value">$4,000</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">Spent so far</p>
          <p className="dash-stat-value text-rose-600 dark:text-rose-400">$2,847</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">Remaining</p>
          <p className="dash-stat-value text-emerald-600 dark:text-emerald-400">$1,153</p>
        </article>
      </section>

      <section className="space-y-4">
        {/* TODO: .map(budget => <BudgetRow />) from GET /budgets — duplicate article below per budget */}

        <article className="dash-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="dash-category-icon bg-slate-100 dark:bg-slate-800">🛒</span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Groceries</h3>
                <p className="text-xs text-slate-500">Monthly limit · May 2026</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                $680 <span className="text-sm font-normal text-slate-400">/ $800</span>
              </p>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">$120 left</p>
            </div>
          </div>
          <div className="mt-4 dash-progress-track h-2.5">
            <div className="dash-progress-fill" style={{ width: "85%" }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="dash-badge dash-badge-amber">Near limit</span>
            <div className="flex gap-1">
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Adjust</button>
              <Link href="/expense/expenses" className="dash-btn-ghost px-2 py-1 text-xs">View expenses</Link>
            </div>
          </div>
        </article>

        <article className="dash-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="dash-category-icon bg-slate-100 dark:bg-slate-800">🚗</span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Transport</h3>
                <p className="text-xs text-slate-500">Monthly limit · May 2026</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                $420 <span className="text-sm font-normal text-slate-400">/ $400</span>
              </p>
              <p className="text-xs font-medium text-rose-500">Over by $20</p>
            </div>
          </div>
          <div className="mt-4 dash-progress-track h-2.5">
            <div className="dash-progress-fill bg-rose-500" style={{ width: "100%" }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="dash-badge dash-badge-rose">Over budget</span>
            <div className="flex gap-1">
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Adjust</button>
              <Link href="/expense/expenses" className="dash-btn-ghost px-2 py-1 text-xs">View expenses</Link>
            </div>
          </div>
        </article>

        <article className="dash-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="dash-category-icon bg-slate-100 dark:bg-slate-800">🎬</span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Entertainment</h3>
                <p className="text-xs text-slate-500">Monthly limit · May 2026</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                $156 <span className="text-sm font-normal text-slate-400">/ $300</span>
              </p>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">$144 left</p>
            </div>
          </div>
          <div className="mt-4 dash-progress-track h-2.5">
            <div className="dash-progress-fill" style={{ width: "52%" }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="dash-badge dash-badge-emerald">On track</span>
            <div className="flex gap-1">
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Adjust</button>
              <Link href="/expense/expenses" className="dash-btn-ghost px-2 py-1 text-xs">View expenses</Link>
            </div>
          </div>
        </article>

        <article className="dash-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="dash-category-icon bg-slate-100 dark:bg-slate-800">🛍️</span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Shopping</h3>
                <p className="text-xs text-slate-500">Monthly limit · May 2026</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                $310 <span className="text-sm font-normal text-slate-400">/ $500</span>
              </p>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">$190 left</p>
            </div>
          </div>
          <div className="mt-4 dash-progress-track h-2.5">
            <div className="dash-progress-fill" style={{ width: "62%" }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="dash-badge dash-badge-emerald">On track</span>
            <div className="flex gap-1">
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Adjust</button>
              <Link href="/expense/expenses" className="dash-btn-ghost px-2 py-1 text-xs">View expenses</Link>
            </div>
          </div>
        </article>
      </section>
    </ExpenseShell>
  );
}
