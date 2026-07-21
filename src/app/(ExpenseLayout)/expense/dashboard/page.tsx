import Link from "next/link";
import { ExpensePageHeader, StatCard } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function DashboardPage() {
  return (
    <ExpenseShell activeNav="dashboard" headerTitle="Overview">
      <ExpensePageHeader title="Financial overview" subtitle="Working professional · May 2026">
        <button type="button" className="dash-btn-secondary">This month</button>
        <Link href="/expense/reports" className="dash-btn-secondary">Auto report</Link>
      </ExpensePageHeader>

      {/* TODO: GET /dashboard/net-worth — sum(accounts) + sum(assets) - liabilities */}
      <section className="dash-net-worth mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Net worth</p>
        <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white">$24,680</p>
        <p className="mt-1 text-xs text-slate-500">Initial savings $8,000 · Salary credited · Funds allocated</p>
      </section>

      <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monthly salary" value="$4,200" delta="Credited May 25" deltaType="down" />
        <StatCard label="Funds allocated" value="$3,800" delta="90% of income" deltaType="up" />
        <StatCard label="Spent" value="$2,847" delta="12% vs last month" deltaType="up" />
        <StatCard label="Free cash" value="$1,153" delta="Available now" deltaType="down" />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Quick links — money core modules */}
        <section className="dash-card lg:col-span-1">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white">Money management</h2>
          <p className="mb-3 text-[10px] text-slate-500">Core modules for professionals</p>
          <ul className="space-y-1.5 text-xs">
            <li><Link href="/expense/ledger" className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.04]"><span>Ledger</span><span className="text-slate-400">→</span></Link></li>
            <li><Link href="/expense/funds" className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.04]"><span>Monthly funds</span><span className="text-slate-400">→</span></Link></li>
            <li><Link href="/expense/salary" className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.04]"><span>Salary</span><span className="text-slate-400">→</span></Link></li>
            <li><Link href="/expense/accounts" className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.04]"><span>Bank accounts</span><span className="text-slate-400">→</span></Link></li>
            <li><Link href="/expense/transfers" className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.04]"><span>Transfers</span><span className="text-slate-400">→</span></Link></li>
            <li><Link href="/expense/recurring" className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.04]"><span>Recurring bills</span><span className="text-slate-400">→</span></Link></li>
            <li><Link href="/expense/goals" className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.04]"><span>Savings goals</span><span className="text-slate-400">→</span></Link></li>
          </ul>
        </section>

        <section className="dash-card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white">Recent ledger entries</h2>
            <Link href="/expense/ledger" className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Full ledger →</Link>
          </div>
          <div className="dash-table-wrap border-0">
            <table className="dash-table min-w-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Account</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-slate-500">May 28</td>
                  <td className="font-medium text-slate-900 dark:text-white">Groceries</td>
                  <td><span className="dash-badge dash-badge-slate">Checking</span></td>
                  <td className="text-right dash-ledger-debit">$84.20</td>
                  <td className="text-right">—</td>
                </tr>
                <tr>
                  <td className="text-slate-500">May 25</td>
                  <td className="font-medium text-slate-900 dark:text-white">Salary deposit</td>
                  <td><span className="dash-badge dash-badge-emerald">Checking</span></td>
                  <td className="text-right">—</td>
                  <td className="text-right dash-ledger-credit">$4,200</td>
                </tr>
                <tr>
                  <td className="text-slate-500">May 25</td>
                  <td className="font-medium text-slate-900 dark:text-white">Fund allocation — savings</td>
                  <td><span className="dash-badge dash-badge-slate">Savings</span></td>
                  <td className="text-right">—</td>
                  <td className="text-right dash-ledger-credit">$800</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ExpenseShell>
  );
}
