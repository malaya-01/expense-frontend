import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalCalendarPage() {
  return (
    <JournalShell activeNav="calendar" headerTitle="Calendar">
      <JournalPageHeader title="Calendar" subtitle="Tasks, habits, and journal entries on a timeline">
        <button type="button" className="jrn-btn-secondary">Month</button>
        <button type="button" className="jrn-btn-secondary">Week</button>
      </JournalPageHeader>
      {/* TODO: Full calendar component — sync tasks + daily journal + meetings */}
      <section className="jrn-card">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
          {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
            <div key={d} className="py-1 font-semibold text-slate-500">{d}</div>
          ))}
          {Array.from({ length: 35 }, (_, i) => (
            <div
              key={i}
              className={`min-h-[48px] rounded-md border border-slate-100 p-1 dark:border-white/[0.04] ${i === 18 ? "bg-violet-500/10 ring-1 ring-violet-400/40" : ""}`}
            >
              <span className="text-slate-400">{i < 4 ? "" : i - 3}</span>
            </div>
          ))}
        </div>
      </section>
    </JournalShell>
  );
}
