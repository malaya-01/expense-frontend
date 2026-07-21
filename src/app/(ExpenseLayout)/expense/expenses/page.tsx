import { ExpensePageHeader } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function ExpensesPage() {
  return (
    <ExpenseShell activeNav="expenses" headerTitle="Expenses">
      <ExpensePageHeader
        title="Expenses"
        subtitle="Track and manage every transaction"
      >
        {/* TODO: Open AddExpenseModal or navigate to /expenses/new */}
        <button type="button" className="dash-btn-primary">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add expense
        </button>
        {/* TODO: Export → GET /expenses/export?format=csv, trigger file download */}
        <button type="button" className="dash-btn-secondary">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
      </ExpensePageHeader>

      {/* Filters bar */}
      <section className="dash-card mb-6">
        {/* TODO: Wire filters → GET /expenses?from=&to=&category=&q= with query params */}
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="filter-search" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search
            </label>
            <input id="filter-search" type="search" placeholder="Description…" className="dash-input" />
          </div>
          <div>
            <label htmlFor="filter-category" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Category
            </label>
            {/* TODO: Populate options from GET /categories */}
            <select id="filter-category" className="dash-select">
              <option value="">All categories</option>
              <option value="groceries">Groceries</option>
              <option value="transport">Transport</option>
              <option value="entertainment">Entertainment</option>
              <option value="shopping">Shopping</option>
              <option value="bills">Bills</option>
            </select>
          </div>
          <div>
            <label htmlFor="filter-from" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              From
            </label>
            <input id="filter-from" type="date" className="dash-input" defaultValue="2026-05-01" />
          </div>
          <div>
            <label htmlFor="filter-to" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              To
            </label>
            <input id="filter-to" type="date" className="dash-input" defaultValue="2026-05-31" />
          </div>
        </form>
      </section>

      {/* Expenses table */}
      <section className="dash-card p-0">
        <div className="dash-table-wrap rounded-2xl border-0">
          <table className="dash-table">
            <thead>
              <tr>
                <th>
                  {/* TODO: Select-all checkbox → bulk delete / bulk categorize */}
                  <input type="checkbox" aria-label="Select all" className="size-4 rounded border-slate-300" />
                </th>
                <th>Description</th>
                <th>Category</th>
                <th>Date</th>
                <th>Payment</th>
                <th className="text-right">Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* TODO: .map(expense => <ExpenseRow key={expense.id} ... />) */}
              <tr>
                <td><input type="checkbox" aria-label="Select row" className="size-4 rounded border-slate-300" /></td>
                <td className="font-medium text-slate-900 dark:text-white">Whole Foods Market</td>
                <td><span className="dash-badge dash-badge-emerald">Groceries</span></td>
                <td className="text-slate-500">May 28, 2026</td>
                <td><span className="dash-badge dash-badge-slate">Debit card</span></td>
                <td className="text-right font-mono font-semibold text-rose-600 dark:text-rose-400">-$84.20</td>
                <td>
                  <div className="flex gap-1">
                    {/* TODO: Edit → open modal with expense id, PATCH /expenses/:id */}
                    <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Edit</button>
                    {/* TODO: Delete → confirm dialog, DELETE /expenses/:id */}
                    <button type="button" className="dash-btn-ghost px-2 py-1 text-xs text-rose-600">Delete</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td><input type="checkbox" className="size-4 rounded border-slate-300" /></td>
                <td className="font-medium text-slate-900 dark:text-white">Uber Ride</td>
                <td><span className="dash-badge dash-badge-amber">Transport</span></td>
                <td className="text-slate-500">May 27, 2026</td>
                <td><span className="dash-badge dash-badge-slate">Credit card</span></td>
                <td className="text-right font-mono font-semibold text-rose-600 dark:text-rose-400">-$18.50</td>
                <td>
                  <div className="flex gap-1">
                    <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Edit</button>
                    <button type="button" className="dash-btn-ghost px-2 py-1 text-xs text-rose-600">Delete</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td><input type="checkbox" className="size-4 rounded border-slate-300" /></td>
                <td className="font-medium text-slate-900 dark:text-white">Electric Bill</td>
                <td><span className="dash-badge dash-badge-rose">Bills</span></td>
                <td className="text-slate-500">May 25, 2026</td>
                <td><span className="dash-badge dash-badge-slate">Bank transfer</span></td>
                <td className="text-right font-mono font-semibold text-rose-600 dark:text-rose-400">-$112.00</td>
                <td>
                  <div className="flex gap-1">
                    <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Edit</button>
                    <button type="button" className="dash-btn-ghost px-2 py-1 text-xs text-rose-600">Delete</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td><input type="checkbox" className="size-4 rounded border-slate-300" /></td>
                <td className="font-medium text-slate-900 dark:text-white">Freelance Payment</td>
                <td><span className="dash-badge dash-badge-emerald">Income</span></td>
                <td className="text-slate-500">May 24, 2026</td>
                <td><span className="dash-badge dash-badge-slate">Bank transfer</span></td>
                <td className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">+$850.00</td>
                <td>
                  <div className="flex gap-1">
                    <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Edit</button>
                    <button type="button" className="dash-btn-ghost px-2 py-1 text-xs text-rose-600">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            {/* TODO: Show real counts from API meta — "Showing 1–10 of 47" */}
            Showing 1–4 of 47 expenses
          </p>
          <div className="flex gap-1">
            {/* TODO: onClick → setPage(page - 1), refetch with ?page=&limit= */}
            <button type="button" className="dash-btn-ghost px-2 py-1 text-xs" disabled>Previous</button>
            <button type="button" className="dash-btn-ghost bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">1</button>
            <button type="button" className="dash-btn-ghost px-2.5 py-1 text-xs">2</button>
            <button type="button" className="dash-btn-ghost px-2.5 py-1 text-xs">3</button>
            <button type="button" className="dash-btn-ghost px-2 py-1 text-xs">Next</button>
          </div>
        </div>
      </section>
    </ExpenseShell>
  );
}
