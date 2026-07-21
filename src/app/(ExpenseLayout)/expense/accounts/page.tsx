import { ExpensePageHeader } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function AccountsPage() {
  return (
    <ExpenseShell activeNav="accounts" headerTitle="Bank accounts">
      <ExpensePageHeader
        title="Bank accounts"
        subtitle="Link and manage checking, savings, and credit accounts"
      >
        {/* TODO: POST /accounts — { name, type, institution, openingBalance, lastFour } */}
        <button type="button" className="dash-btn-primary">Add account</button>
        {/* TODO: Future — bank sync via Plaid / open banking API */}
        <button type="button" className="dash-btn-secondary">Connect bank</button>
      </ExpensePageHeader>

      {/* TODO: GET /accounts/summary — total balance across accounts */}
      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        <article className="dash-stat-card">
          <p className="dash-stat-label">Total balance</p>
          <p className="dash-stat-value">$24,680</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">Checking</p>
          <p className="dash-stat-value">$3,880</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">Savings</p>
          <p className="dash-stat-value">$8,800</p>
        </article>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {/* TODO: .map(account => ...) from GET /accounts */}
        <article className="dash-card relative overflow-hidden">
          <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-full bg-emerald-500/10" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Checking</p>
          <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">Chase Total Checking</h3>
          <p className="font-mono text-[10px] text-slate-400">···· 4821</p>
          <p className="mt-3 font-mono text-xl font-bold text-slate-900 dark:text-white">$3,880.42</p>
          <p className="mt-1 text-[10px] text-slate-500">Updated May 28 · Primary</p>
          <div className="mt-3 flex gap-1">
            <button type="button" className="dash-btn-ghost px-2 py-1 text-[10px]">Edit</button>
            <button type="button" className="dash-btn-ghost px-2 py-1 text-[10px]">Transactions</button>
          </div>
        </article>

        <article className="dash-card relative overflow-hidden">
          <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-full bg-indigo-500/10" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Savings</p>
          <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">Marcus High-Yield</h3>
          <p className="font-mono text-[10px] text-slate-400">···· 9103</p>
          <p className="mt-3 font-mono text-xl font-bold text-slate-900 dark:text-white">$8,800.00</p>
          <p className="mt-1 text-[10px] text-slate-500">Emergency + initial savings</p>
          <div className="mt-3 flex gap-1">
            <button type="button" className="dash-btn-ghost px-2 py-1 text-[10px]">Edit</button>
            <button type="button" className="dash-btn-ghost px-2 py-1 text-[10px]">Transactions</button>
          </div>
        </article>

        <article className="dash-card relative overflow-hidden">
          <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-full bg-violet-500/10" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Investment</p>
          <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">Fidelity Brokerage</h3>
          <p className="font-mono text-[10px] text-slate-400">···· 3377</p>
          <p className="mt-3 font-mono text-xl font-bold text-slate-900 dark:text-white">$12,000.00</p>
          <p className="mt-1 text-[10px] text-slate-500">Long-term assets</p>
          <div className="mt-3 flex gap-1">
            <button type="button" className="dash-btn-ghost px-2 py-1 text-[10px]">Edit</button>
            <button type="button" className="dash-btn-ghost px-2 py-1 text-[10px]">Holdings</button>
          </div>
        </article>

        <button
          type="button"
          className="dash-card flex min-h-[140px] flex-col items-center justify-center gap-2 border-dashed border-slate-300 bg-transparent text-slate-500 dark:border-white/10"
        >
          <span className="text-lg">+</span>
          <span className="text-xs font-medium">Add account</span>
        </button>
      </section>
    </ExpenseShell>
  );
}
