import { ExpensePageHeader } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function SalaryPage() {
  return (
    <ExpenseShell activeNav="salary" headerTitle="Salary">
      <ExpensePageHeader
        title="Salary management"
        subtitle="Track income, pay schedule, and post-payday workflows"
      >
        {/* TODO: POST /salary — add/update salary profile { amount, frequency, payDay } */}
        <button type="button" className="dash-btn-primary">Add salary source</button>
      </ExpensePageHeader>

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        <article className="dash-stat-card">
          <p className="dash-stat-label">Monthly gross</p>
          <p className="dash-stat-value">$4,200</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">Next payday</p>
          <p className="dash-stat-value text-base">Jun 25</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">YTD earned</p>
          <p className="dash-stat-value text-emerald-600 dark:text-emerald-400">$21,000</p>
        </article>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="dash-card">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white">Primary employment</h2>
          <p className="mb-3 text-[10px] text-slate-500">TODO: GET /salary/sources</p>

          <dl className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-100 py-2 dark:border-white/[0.04]">
              <dt className="text-slate-500">Employer</dt>
              <dd className="font-medium text-slate-900 dark:text-white">Acme Corp</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-2 dark:border-white/[0.04]">
              <dt className="text-slate-500">Pay frequency</dt>
              <dd className="font-medium">Monthly (25th)</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-2 dark:border-white/[0.04]">
              <dt className="text-slate-500">Deposit account</dt>
              <dd className="font-medium">Chase Checking ···4821</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">Auto-actions on credit</dt>
              <dd><span className="dash-badge dash-badge-emerald">Fund split ON</span></dd>
            </div>
          </dl>

          {/* TODO: On salary credit webhook/cron → POST /funds/allocate + ledger entry SAL-* */}
          <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-[10px] text-emerald-800 dark:text-emerald-300">
            When salary hits, auto-create ledger credit + run fund allocation rules.
          </p>
        </section>

        <section className="dash-card">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white">Pay history</h2>
          <div className="dash-table-wrap mt-2 border-0">
            <table className="dash-table min-w-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* TODO: GET /salary/history */}
                <tr>
                  <td className="text-slate-500">May 25</td>
                  <td>Acme Corp</td>
                  <td className="text-right dash-ledger-credit">$4,200</td>
                  <td><span className="dash-badge dash-badge-emerald">Allocated</span></td>
                </tr>
                <tr>
                  <td className="text-slate-500">Apr 25</td>
                  <td>Acme Corp</td>
                  <td className="text-right dash-ledger-credit">$4,200</td>
                  <td><span className="dash-badge dash-badge-emerald">Allocated</span></td>
                </tr>
                <tr>
                  <td className="text-slate-500">Apr 10</td>
                  <td>Freelance</td>
                  <td className="text-right dash-ledger-credit">$850</td>
                  <td><span className="dash-badge dash-badge-slate">Manual</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ExpenseShell>
  );
}
