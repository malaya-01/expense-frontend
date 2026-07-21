import Link from "next/link";
import { ExpensePageHeader } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function AssetsPage() {
  return (
    <ExpenseShell activeNav="assets" headerTitle="Assets">
      <ExpensePageHeader
        title="Asset division"
        subtitle="Split wealth across cash, investments, and goals"
      >
        {/* TODO: POST /assets/rebalance — suggest moves based on target allocation */}
        <button type="button" className="dash-btn-primary">Rebalance</button>
        <Link href="/expense/reports" className="dash-btn-secondary">Asset report</Link>
      </ExpensePageHeader>

      {/* TODO: GET /assets/allocation — current vs target percentages */}
      <section className="mb-4 grid gap-3 lg:grid-cols-2">
        <article className="dash-card">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white">Current allocation</h2>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div
              className="relative size-32 rounded-full"
              style={{
                background: `conic-gradient(
                  #10b981 0deg 55deg,
                  #6366f1 55deg 130deg,
                  #f59e0b 130deg 200deg,
                  #94a3b8 200deg 360deg
                )`,
              }}
            >
              <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white dark:bg-[#12151c]">
                <p className="text-[9px] text-slate-500">Total</p>
                <p className="font-mono text-sm font-bold">$24.7k</p>
              </div>
            </div>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" /> Cash 15%</li>
              <li className="flex items-center gap-2"><span className="size-2 rounded-full bg-indigo-500" /> Investments 49%</li>
              <li className="flex items-center gap-2"><span className="size-2 rounded-full bg-amber-500" /> Savings 36%</li>
            </ul>
          </div>
        </article>

        <article className="dash-card">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white">Target allocation</h2>
          <p className="mb-3 text-[10px] text-slate-500">TODO: PATCH /assets/targets — professional default: 20/50/30</p>
          <ul className="space-y-2 text-xs">
            <li>
              <div className="mb-0.5 flex justify-between"><span>Cash (liquid)</span><span className="font-mono">20%</span></div>
              <div className="dash-progress-track h-1"><div className="dash-progress-fill" style={{ width: "20%" }} /></div>
            </li>
            <li>
              <div className="mb-0.5 flex justify-between"><span>Investments</span><span className="font-mono">50%</span></div>
              <div className="dash-progress-track h-1"><div className="dash-progress-fill bg-indigo-500" style={{ width: "50%" }} /></div>
            </li>
            <li>
              <div className="mb-0.5 flex justify-between"><span>Savings / goals</span><span className="font-mono">30%</span></div>
              <div className="dash-progress-track h-1"><div className="dash-progress-fill bg-amber-500" style={{ width: "30%" }} /></div>
            </li>
          </ul>
        </article>
      </section>

      <section className="dash-card">
        <h2 className="mb-3 text-xs font-bold text-slate-900 dark:text-white">Asset breakdown</h2>
        <div className="dash-table-wrap border-0">
          <table className="dash-table min-w-0">
            <thead>
              <tr>
                <th>Asset class</th>
                <th>Account / holding</th>
                <th className="text-right">Value</th>
                <th className="text-right">Weight</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {/* TODO: GET /assets/breakdown — merge accounts + investments + physical assets */}
              <tr>
                <td>Cash</td>
                <td>Chase Checking</td>
                <td className="text-right font-mono">$3,880</td>
                <td className="text-right font-mono">15.7%</td>
                <td><span className="dash-badge dash-badge-amber">Under target</span></td>
              </tr>
              <tr>
                <td>Savings</td>
                <td>Marcus HYSA</td>
                <td className="text-right font-mono">$8,800</td>
                <td className="text-right font-mono">35.7%</td>
                <td><span className="dash-badge dash-badge-emerald">On target</span></td>
              </tr>
              <tr>
                <td>Investments</td>
                <td>Fidelity Brokerage</td>
                <td className="text-right font-mono">$12,000</td>
                <td className="text-right font-mono">48.6%</td>
                <td><span className="dash-badge dash-badge-emerald">Near target</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </ExpenseShell>
  );
}
