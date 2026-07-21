import { ExpensePageHeader } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function RecurringPage() {
  return (
    <ExpenseShell activeNav="recurring" headerTitle="Recurring">
      <ExpensePageHeader title="Recurring & subscriptions" subtitle="Bills, subscriptions, and fixed monthly outflows">
        {/* TODO: POST /recurring { name, amount, frequency, categoryId, nextDueDate } */}
        <button type="button" className="dash-btn-primary">Add recurring</button>
      </ExpensePageHeader>

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        <article className="dash-stat-card">
          <p className="dash-stat-label">Monthly fixed</p>
          <p className="dash-stat-value text-rose-600 dark:text-rose-400">$487</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">Active items</p>
          <p className="dash-stat-value">8</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">Due this week</p>
          <p className="dash-stat-value text-amber-600">3</p>
        </article>
      </section>

      <section className="dash-card p-0">
        <div className="dash-table-wrap rounded-xl border-0">
          <table className="dash-table min-w-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Frequency</th>
                <th>Next due</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium text-slate-900 dark:text-white">Netflix</td>
                <td><span className="dash-badge dash-badge-slate">Entertainment</span></td>
                <td>Monthly</td>
                <td>Jun 27</td>
                <td className="text-right font-mono">$15.99</td>
                <td><span className="dash-badge dash-badge-emerald">Active</span></td>
              </tr>
              <tr>
                <td className="font-medium text-slate-900 dark:text-white">Rent</td>
                <td><span className="dash-badge dash-badge-rose">Housing</span></td>
                <td>Monthly</td>
                <td>Jun 1</td>
                <td className="text-right font-mono">$1,200</td>
                <td><span className="dash-badge dash-badge-emerald">Active</span></td>
              </tr>
              <tr>
                <td className="font-medium text-slate-900 dark:text-white">Gym membership</td>
                <td><span className="dash-badge dash-badge-emerald">Health</span></td>
                <td>Monthly</td>
                <td>Jun 5</td>
                <td className="text-right font-mono">$45.00</td>
                <td><span className="dash-badge dash-badge-emerald">Active</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </ExpenseShell>
  );
}
