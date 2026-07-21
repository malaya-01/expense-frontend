import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalTemplatesPage() {
  return (
    <JournalShell activeNav="templates" headerTitle="Templates">
      <JournalPageHeader title="Templates" subtitle="Start faster with pre-built page structures">
        <button type="button" className="jrn-btn-primary">Create template</button>
      </JournalPageHeader>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: "📓", name: "Daily journal", desc: "Morning + evening prompts" },
          { icon: "👥", name: "Meeting notes", desc: "Agenda, notes, action items" },
          { icon: "🎯", name: "OKR planner", desc: "Objectives and key results" },
          { icon: "📚", name: "Book notes", desc: "Summary, quotes, takeaways" },
          { icon: "🧠", name: "Weekly review", desc: "Reflect on the past week" },
          { icon: "💼", name: "Project brief", desc: "Scope, timeline, stakeholders" },
        ].map((t) => (
          <button key={t.name} type="button" className="jrn-card text-left hover:ring-2 hover:ring-violet-400/30">
            <span className="text-2xl">{t.icon}</span>
            <h3 className="mt-2 text-sm font-semibold">{t.name}</h3>
            <p className="text-[10px] text-slate-500">{t.desc}</p>
          </button>
        ))}
      </div>
    </JournalShell>
  );
}
