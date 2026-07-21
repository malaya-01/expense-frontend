import { ExpensePageHeader } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function GoalsPage() {
  return (
    <ExpenseShell activeNav="goals" headerTitle="Goals">
      <ExpensePageHeader title="Savings goals" subtitle="Track progress toward financial milestones">
        {/* TODO: POST /goals { name, targetAmount, targetDate, linkedFundJarId } */}
        <button type="button" className="dash-btn-primary">New goal</button>
      </ExpensePageHeader>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article className="dash-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-500">Emergency fund</p>
              <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-white">$8,000</p>
              <p className="text-[10px] text-slate-500">Target $10,000 · Dec 2026</p>
            </div>
            <span className="dash-badge dash-badge-emerald">80%</span>
          </div>
          <div className="mt-3 dash-progress-track h-1.5">
            <div className="dash-progress-fill" style={{ width: "80%" }} />
          </div>
        </article>

        <article className="dash-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-500">Vacation fund</p>
              <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-white">$1,240</p>
              <p className="text-[10px] text-slate-500">Target $3,000 · Aug 2026</p>
            </div>
            <span className="dash-badge dash-badge-amber">41%</span>
          </div>
          <div className="mt-3 dash-progress-track h-1.5">
            <div className="dash-progress-fill bg-amber-500" style={{ width: "41%" }} />
          </div>
        </article>

        <article className="dash-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-500">New laptop</p>
              <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-white">$650</p>
              <p className="text-[10px] text-slate-500">Target $1,500 · Nov 2026</p>
            </div>
            <span className="dash-badge dash-badge-slate">43%</span>
          </div>
          <div className="mt-3 dash-progress-track h-1.5">
            <div className="dash-progress-fill bg-indigo-500" style={{ width: "43%" }} />
          </div>
        </article>
      </section>
    </ExpenseShell>
  );
}
