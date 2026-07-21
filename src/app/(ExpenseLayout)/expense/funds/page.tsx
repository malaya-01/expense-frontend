import { ExpensePageHeader } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function FundsPage() {
  return (
    <ExpenseShell activeNav="funds" headerTitle="Monthly funds">
      <ExpensePageHeader
        title="Monthly funds"
        subtitle="Allocate salary into spending buckets each month"
      >
        {/* TODO: POST /funds/allocate — split salary across fund jars after payday */}
        <button type="button" className="dash-btn-primary">Allocate funds</button>
      </ExpensePageHeader>

      {/* TODO: GET /funds/summary — initial savings + monthly allocations - spent */}
      <section className="mb-4 grid gap-3 sm:grid-cols-4">
        <article className="dash-stat-card">
          <p className="dash-stat-label">Initial savings</p>
          <p className="dash-stat-value">$8,000</p>
          <p className="text-[10px] text-slate-500">Starting balance</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">This month in</p>
          <p className="dash-stat-value text-emerald-600 dark:text-emerald-400">$4,200</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">Allocated</p>
          <p className="dash-stat-value">$3,800</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">Unallocated</p>
          <p className="dash-stat-value text-amber-600">$400</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {/* Fund jars */}
        <article className="dash-card">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white">Fund jars — May 2026</h2>
          <p className="mb-3 text-[10px] text-slate-500">TODO: GET /funds/jars?month=2026-05</p>

          <ul className="space-y-3">
            <li>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-slate-800 dark:text-slate-200">🏠 Living expenses</span>
                <span className="font-mono">$1,500 / $1,500</span>
              </div>
              <div className="dash-progress-track h-1.5"><div className="dash-progress-fill" style={{ width: "100%" }} /></div>
            </li>
            <li>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-slate-800 dark:text-slate-200">💰 Emergency fund</span>
                <span className="font-mono">$800 / $800</span>
              </div>
              <div className="dash-progress-track h-1.5"><div className="dash-progress-fill bg-indigo-500" style={{ width: "100%" }} /></div>
            </li>
            <li>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-slate-800 dark:text-slate-200">📈 Investments</span>
                <span className="font-mono">$600 / $800</span>
              </div>
              <div className="dash-progress-track h-1.5"><div className="dash-progress-fill bg-violet-500" style={{ width: "75%" }} /></div>
            </li>
            <li>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-slate-800 dark:text-slate-200">🎯 Goals / leisure</span>
                <span className="font-mono">$400 / $500</span>
              </div>
              <div className="dash-progress-track h-1.5"><div className="dash-progress-fill bg-amber-500" style={{ width: "80%" }} /></div>
            </li>
            <li>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-slate-800 dark:text-slate-200">🔄 Rolling savings</span>
                <span className="font-mono">$500 / $600</span>
              </div>
              <div className="dash-progress-track h-1.5"><div className="dash-progress-fill" style={{ width: "83%" }} /></div>
            </li>
          </ul>
        </article>

        {/* Allocation rules */}
        <article className="dash-card">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white">Auto-allocation rules</h2>
          <p className="mb-3 text-[10px] text-slate-500">Applied when salary is credited</p>

          {/* TODO: POST /funds/rules — percentage split on salary credit event */}
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
              <span>Living expenses</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">35%</span>
            </li>
            <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
              <span>Emergency fund</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">20%</span>
            </li>
            <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
              <span>Investments</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">15%</span>
            </li>
            <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
              <span>Goals / leisure</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">12%</span>
            </li>
            <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
              <span>Rolling savings</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">18%</span>
            </li>
          </ul>
          <button type="button" className="dash-btn-secondary mt-3 w-full">Edit rules</button>
        </article>
      </section>
    </ExpenseShell>
  );
}
