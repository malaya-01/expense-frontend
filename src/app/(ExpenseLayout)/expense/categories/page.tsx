import { ExpensePageHeader } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function CategoriesPage() {
  return (
    <ExpenseShell activeNav="categories" headerTitle="Categories">
      <ExpensePageHeader
        title="Categories"
        subtitle="Organize spending with custom categories"
      >
        {/* TODO: Open CreateCategoryModal → POST /categories { name, icon, color } */}
        <button type="button" className="dash-btn-primary">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New category
        </button>
      </ExpensePageHeader>

      {/* TODO: .map(category => ...) from GET /categories?include=spentThisMonth */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Groceries */}
        <article className="dash-card group transition hover:border-emerald-300 dark:hover:border-emerald-700">
          <div className="flex items-start justify-between">
            <span className="dash-category-icon bg-emerald-100 dark:bg-emerald-500/15">🛒</span>
            <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
              {/* TODO: PATCH /categories/:id */}
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Edit</button>
              {/* TODO: DELETE /categories/:id — block if expenses exist */}
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs text-rose-600">Delete</button>
            </div>
          </div>
          <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">Groceries</h3>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white">$680.40</p>
          <p className="text-xs text-slate-500">12 transactions · May</p>
          <div className="mt-3 dash-progress-track">
            <div className="dash-progress-fill" style={{ width: "85%" }} />
          </div>
          <p className="mt-1 text-[10px] text-slate-400">85% of $800 budget</p>
        </article>

        {/* Transport */}
        <article className="dash-card group transition hover:border-amber-300 dark:hover:border-amber-700">
          <div className="flex items-start justify-between">
            <span className="dash-category-icon bg-amber-100 dark:bg-amber-500/15">🚗</span>
            <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Edit</button>
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs text-rose-600">Delete</button>
            </div>
          </div>
          <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">Transport</h3>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white">$420.00</p>
          <p className="text-xs text-slate-500">8 transactions · May</p>
          <div className="mt-3 dash-progress-track">
            <div className="dash-progress-fill bg-rose-500" style={{ width: "100%" }} />
          </div>
          <p className="mt-1 text-[10px] text-rose-500">Over budget by $20</p>
        </article>

        {/* Entertainment */}
        <article className="dash-card group transition hover:border-indigo-300 dark:hover:border-indigo-700">
          <div className="flex items-start justify-between">
            <span className="dash-category-icon bg-indigo-100 dark:bg-indigo-500/15">🎬</span>
            <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Edit</button>
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs text-rose-600">Delete</button>
            </div>
          </div>
          <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">Entertainment</h3>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white">$156.50</p>
          <p className="text-xs text-slate-500">5 transactions · May</p>
          <div className="mt-3 dash-progress-track">
            <div className="dash-progress-fill bg-indigo-500" style={{ width: "52%" }} />
          </div>
          <p className="mt-1 text-[10px] text-slate-400">52% of $300 budget</p>
        </article>

        {/* Shopping */}
        <article className="dash-card group transition hover:border-violet-300 dark:hover:border-violet-700">
          <div className="flex items-start justify-between">
            <span className="dash-category-icon bg-violet-100 dark:bg-violet-500/15">🛍️</span>
            <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Edit</button>
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs text-rose-600">Delete</button>
            </div>
          </div>
          <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">Shopping</h3>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white">$310.20</p>
          <p className="text-xs text-slate-500">6 transactions · May</p>
          <div className="mt-3 dash-progress-track">
            <div className="dash-progress-fill bg-violet-500" style={{ width: "62%" }} />
          </div>
          <p className="mt-1 text-[10px] text-slate-400">62% of $500 budget</p>
        </article>

        {/* Bills */}
        <article className="dash-card group transition hover:border-rose-300 dark:hover:border-rose-700">
          <div className="flex items-start justify-between">
            <span className="dash-category-icon bg-rose-100 dark:bg-rose-500/15">📄</span>
            <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Edit</button>
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs text-rose-600">Delete</button>
            </div>
          </div>
          <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">Bills</h3>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white">$240.00</p>
          <p className="text-xs text-slate-500">3 transactions · May</p>
          <div className="mt-3 dash-progress-track">
            <div className="dash-progress-fill bg-rose-500" style={{ width: "60%" }} />
          </div>
          <p className="mt-1 text-[10px] text-slate-400">60% of $400 budget</p>
        </article>

        {/* Income */}
        <article className="dash-card group transition hover:border-emerald-300 dark:hover:border-emerald-700">
          <div className="flex items-start justify-between">
            <span className="dash-category-icon bg-emerald-100 dark:bg-emerald-500/15">💰</span>
            <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Edit</button>
              <button type="button" className="dash-btn-ghost px-2 py-1 text-xs text-rose-600">Delete</button>
            </div>
          </div>
          <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">Income</h3>
          <p className="mt-1 font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">+$4,050</p>
          <p className="text-xs text-slate-500">2 transactions · May</p>
          <span className="mt-3 inline-block dash-badge dash-badge-emerald">Income category</span>
        </article>

        {/* Add new — dashed placeholder */}
        <button
          type="button"
          className="dash-card flex min-h-[180px] flex-col items-center justify-center gap-2 border-dashed border-slate-300 bg-transparent text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
        >
          <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-current">
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </span>
          <span className="text-sm font-medium">Add category</span>
        </button>
      </section>
    </ExpenseShell>
  );
}
