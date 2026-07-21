import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalDailyPage() {
  return (
    <JournalShell activeNav="daily" headerTitle="Daily journal">
      <JournalPageHeader title="Daily journal" subtitle="May 30, 2026 — Friday">
        <button type="button" className="jrn-btn-secondary">← Prev</button>
        <button type="button" className="jrn-btn-secondary">Next →</button>
      </JournalPageHeader>

      {/* TODO: GET /journal/daily/:date — template blocks per day */}
      <section className="jrn-card space-y-4">
        <div>
          <label className="text-[10px] font-semibold uppercase text-slate-500">Morning intention</label>
          <textarea className="jrn-input mt-1 min-h-[60px]" placeholder="What matters today?" />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase text-slate-500">Gratitude (3)</label>
          <input className="jrn-input mt-1" placeholder="1." />
          <input className="jrn-input mt-1" placeholder="2." />
          <input className="jrn-input mt-1" placeholder="3." />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase text-slate-500">Evening reflection</label>
          <textarea className="jrn-input mt-1 min-h-[100px]" placeholder="What went well? What to improve?" />
        </div>
        <button type="button" className="jrn-btn-primary">Save entry</button>
      </section>
    </JournalShell>
  );
}
