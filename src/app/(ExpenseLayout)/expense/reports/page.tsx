import { ExpensePageHeader } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function ReportsPage() {
  return (
    <ExpenseShell activeNav="reports" headerTitle="Reports">
      <ExpensePageHeader
        title="Reports & analytics"
        subtitle="Visualize trends and export financial data"
      >
        {/* TODO: Date range → refetch all report widgets */}
        <select className="dash-select w-auto min-w-[140px]" defaultValue="month">
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="quarter">This quarter</option>
          <option value="year">This year</option>
          <option value="custom">Custom range</option>
        </select>
        {/* TODO: GET /reports/export?format=pdf — download report */}
        <button type="button" className="dash-btn-secondary">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PDF
        </button>
      </ExpensePageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending trend — line chart placeholder */}
        <section className="dash-card lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Spending trend</h2>
          <p className="mb-6 text-xs text-slate-500">Daily spending over the last 30 days</p>

          {/* TODO: Replace with Recharts LineChart — data from GET /reports/spending-trend */}
          <div className="relative flex h-48 items-end gap-1 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            {[40, 65, 30, 80, 55, 90, 45, 70, 35, 60, 85, 50, 75, 42, 68].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-emerald-500/70 transition hover:bg-emerald-500"
                style={{ height: `${h}%` }}
                title={`Day ${i + 1}`}
              />
            ))}
          </div>
        </section>

        {/* Income vs Expenses */}
        <section className="dash-card">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Income vs expenses</h2>
          <p className="mb-6 text-xs text-slate-500">May 2026 comparison</p>

          {/* TODO: GET /reports/income-vs-expenses */}
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Income</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">+$4,050</span>
              </div>
              <div className="dash-progress-track h-3">
                <div className="dash-progress-fill" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Expenses</span>
                <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">-$2,847</span>
              </div>
              <div className="dash-progress-track h-3">
                <div className="dash-progress-fill bg-rose-500" style={{ width: "70%" }} />
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
              <p className="text-xs text-slate-500">Net savings</p>
              <p className="font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400">+$1,203</p>
            </div>
          </div>
        </section>

        {/* Top merchants */}
        <section className="dash-card">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Top merchants</h2>
          <p className="mb-4 text-xs text-slate-500">Where you spend the most</p>

          {/* TODO: GET /reports/top-merchants?limit=5 */}
          <ul className="space-y-3">
            {[
              { name: "Whole Foods", amount: "$284", pct: 10 },
              { name: "Amazon", amount: "$210", pct: 7 },
              { name: "Shell", amount: "$156", pct: 5 },
              { name: "Netflix", amount: "$16", pct: 1 },
              { name: "Uber", amount: "$142", pct: 5 },
            ].map((m) => (
              <li key={m.name} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {m.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-medium text-slate-900 dark:text-white">{m.name}</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">{m.amount}</span>
                  </div>
                  <div className="mt-1 dash-progress-track h-1">
                    <div className="dash-progress-fill bg-slate-400" style={{ width: `${m.pct * 8}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Category breakdown donut placeholder */}
        <section className="dash-card lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Category breakdown</h2>
          <p className="mb-6 text-xs text-slate-500">Percentage of total spending by category</p>

          {/* TODO: Recharts PieChart — GET /reports/by-category */}
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div
              className="relative size-40 rounded-full"
              style={{
                background: `conic-gradient(
                  #10b981 0deg 95deg,
                  #f59e0b 95deg 155deg,
                  #6366f1 155deg 200deg,
                  #f43f5e 200deg 235deg,
                  #94a3b8 235deg 360deg
                )`,
              }}
            >
              <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900">
                <p className="font-mono text-xs text-slate-500">Total</p>
                <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">$2.8k</p>
              </div>
            </div>

            <ul className="space-y-2 text-sm">
              {[
                { label: "Groceries", pct: "24%", color: "bg-emerald-500" },
                { label: "Transport", pct: "15%", color: "bg-amber-500" },
                { label: "Shopping", pct: "11%", color: "bg-indigo-500" },
                { label: "Bills", pct: "8%", color: "bg-rose-500" },
                { label: "Other", pct: "42%", color: "bg-slate-400" },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${item.color}`} />
                  <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                  <span className="ml-auto font-mono font-medium text-slate-900 dark:text-white">{item.pct}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </ExpenseShell>
  );
}
