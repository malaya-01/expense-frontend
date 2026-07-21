import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalGoalsPage() {
  return (
    <JournalShell activeNav="goals" headerTitle="Goals">
      <JournalPageHeader title="Goals & OKRs" subtitle="Long-term outcomes and measurable key results">
        <button type="button" className="jrn-btn-primary">Add goal</button>
      </JournalPageHeader>

      {/* TODO: GET /journal/goals — nested objectives like Notion */}
      <section className="jrn-card mb-4">
        <h2 className="text-sm font-bold">Objective: Grow professionally in 2026</h2>
        <ul className="mt-3 space-y-2">
          <li className="rounded-md border border-slate-200/60 p-3 dark:border-white/[0.06]">
            <div className="flex justify-between text-xs">
              <span className="font-medium">KR1 — Launch side project</span>
              <span className="jrn-badge jrn-badge-violet">72%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
              <div className="h-full w-[72%] rounded-full bg-violet-500" />
            </div>
          </li>
          <li className="rounded-md border border-slate-200/60 p-3 dark:border-white/[0.06]">
            <div className="flex justify-between text-xs">
              <span className="font-medium">KR2 — Complete finance course</span>
              <span className="jrn-badge jrn-badge-slate">40%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
              <div className="h-full w-[40%] rounded-full bg-violet-500" />
            </div>
          </li>
        </ul>
      </section>
    </JournalShell>
  );
}
