import { ExpensePageHeader } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function TransfersPage() {
  return (
    <ExpenseShell activeNav="transfers" headerTitle="Transfers">
      <ExpensePageHeader title="Account transfers" subtitle="Move money between your accounts and fund jars">
        {/* TODO: POST /transfers { fromAccountId, toAccountId, amount, note } → creates paired ledger entries */}
        <button type="button" className="dash-btn-primary">New transfer</button>
      </ExpensePageHeader>

      <section className="dash-card mb-4">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white">Quick transfer</h2>
        <form className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">From</label>
            <select className="dash-select">
              <option>Chase Checking</option>
              <option>Marcus Savings</option>
              <option>Living expenses jar</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">To</label>
            <select className="dash-select">
              <option>Marcus Savings</option>
              <option>Investment fund</option>
              <option>Chase Checking</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Amount</label>
            <input type="number" className="dash-input" placeholder="0.00" />
          </div>
          <div className="flex items-end">
            <button type="button" className="dash-btn-primary w-full">Transfer</button>
          </div>
        </form>
      </section>

      <section className="dash-card p-0">
        <div className="dash-table-wrap rounded-xl border-0">
          <table className="dash-table min-w-0">
            <thead>
              <tr>
                <th>Date</th>
                <th>From → To</th>
                <th>Note</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-slate-500">May 25</td>
                <td>Checking → Savings</td>
                <td>Monthly fund allocation</td>
                <td className="text-right font-mono">$800.00</td>
              </tr>
              <tr>
                <td className="text-slate-500">May 10</td>
                <td>Savings → Investment</td>
                <td>Investment top-up</td>
                <td className="text-right font-mono">$600.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </ExpenseShell>
  );
}
