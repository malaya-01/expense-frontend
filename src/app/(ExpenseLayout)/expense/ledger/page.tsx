import { ExpensePageHeader } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function LedgerPage() {
  return (
    <ExpenseShell activeNav="ledger" headerTitle="Ledger">
      <ExpensePageHeader
        title="General ledger"
        subtitle="Double-entry record of every financial movement"
      >
        {/* TODO: POST /ledger/entries — create manual journal entry */}
        <button type="button" className="dash-btn-primary">New entry</button>
        {/* TODO: GET /ledger/export?month=2026-05 — auto-generated ledger PDF */}
        <button type="button" className="dash-btn-secondary">Export ledger</button>
      </ExpensePageHeader>

      {/* TODO: Running balance from GET /ledger/balance — debits must equal credits per entry */}
      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        <article className="dash-stat-card">
          <p className="dash-stat-label">Total debits</p>
          <p className="dash-stat-value text-rose-600 dark:text-rose-400">$2,847</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">Total credits</p>
          <p className="dash-stat-value text-emerald-600 dark:text-emerald-400">$5,050</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">Balance</p>
          <p className="dash-stat-value">$2,203</p>
        </article>
      </section>

      <section className="dash-card mb-4 p-0">
        <div className="border-b border-slate-200/70 px-4 py-2.5 dark:border-white/[0.06]">
          {/* TODO: Filter by account, date range, entry type */}
          <form className="flex flex-wrap gap-2">
            <select className="dash-select w-auto min-w-[130px]">
              <option>All accounts</option>
              <option>Checking</option>
              <option>Savings</option>
              <option>Investment</option>
            </select>
            <input type="date" className="dash-input w-auto" defaultValue="2026-05-01" />
            <input type="date" className="dash-input w-auto" defaultValue="2026-05-31" />
          </form>
        </div>

        <div className="dash-table-wrap rounded-none border-0">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Ref</th>
                <th>Description</th>
                <th>Account</th>
                <th>Category</th>
                <th className="text-right">Debit</th>
                <th className="text-right">Credit</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {/* TODO: .map(entry => ...) from GET /ledger/entries */}
              <tr>
                <td className="text-slate-500">May 28</td>
                <td className="font-mono text-[10px]">EXP-047</td>
                <td className="font-medium text-slate-900 dark:text-white">Whole Foods</td>
                <td>Checking</td>
                <td><span className="dash-badge dash-badge-emerald">Groceries</span></td>
                <td className="text-right dash-ledger-debit">$84.20</td>
                <td className="text-right">—</td>
                <td className="text-right font-mono">$2,203</td>
              </tr>
              <tr>
                <td className="text-slate-500">May 27</td>
                <td className="font-mono text-[10px]">EXP-046</td>
                <td className="font-medium text-slate-900 dark:text-white">Uber</td>
                <td>Checking</td>
                <td><span className="dash-badge dash-badge-amber">Transport</span></td>
                <td className="text-right dash-ledger-debit">$18.50</td>
                <td className="text-right">—</td>
                <td className="text-right font-mono">$2,287</td>
              </tr>
              <tr>
                <td className="text-slate-500">May 25</td>
                <td className="font-mono text-[10px]">SAL-005</td>
                <td className="font-medium text-slate-900 dark:text-white">Monthly salary</td>
                <td>Checking</td>
                <td><span className="dash-badge dash-badge-emerald">Income</span></td>
                <td className="text-right">—</td>
                <td className="text-right dash-ledger-credit">$4,200</td>
                <td className="text-right font-mono">$2,306</td>
              </tr>
              <tr>
                <td className="text-slate-500">May 25</td>
                <td className="font-mono text-[10px]">FND-012</td>
                <td className="font-medium text-slate-900 dark:text-white">Transfer to savings fund</td>
                <td>Savings</td>
                <td><span className="dash-badge dash-badge-slate">Allocation</span></td>
                <td className="text-right">—</td>
                <td className="text-right dash-ledger-credit">$800</td>
                <td className="text-right font-mono">$8,800</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[10px] text-slate-500">
        {/* TODO: Link ledger entries to expenses, salary deposits, and fund transfers automatically */}
        Hint: Each expense creates a debit entry; salary creates credit; fund moves create paired entries.
      </p>
    </ExpenseShell>
  );
}
