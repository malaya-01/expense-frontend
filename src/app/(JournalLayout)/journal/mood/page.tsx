import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalMoodPage() {
  return (
    <JournalShell activeNav="mood" headerTitle="Mood">
      <JournalPageHeader title="Mood tracker" subtitle="Wellness alongside productivity">
        <button type="button" className="jrn-btn-primary">Log today</button>
      </JournalPageHeader>
      <section className="jrn-card mb-4">
        <p className="text-xs font-medium">How do you feel today?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["😫", "😕", "😐", "🙂", "😄"].map((emoji, i) => (
            <button
              key={emoji}
              type="button"
              className={`jrn-mood-dot flex items-center justify-center text-lg ${i === 3 ? "jrn-mood-dot-active bg-violet-100" : "bg-slate-100 dark:bg-white/[0.06]"}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <textarea className="jrn-input mt-3 min-h-[60px]" placeholder="Optional note…" />
      </section>
      <section className="jrn-card">
        <p className="text-[10px] font-semibold uppercase text-slate-500">May overview</p>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: 30 }, (_, i) => (
            <span
              key={i}
              className="size-3 rounded-sm"
              style={{ backgroundColor: `hsl(${140 + (i % 5) * 20}, 60%, ${55 + (i % 3) * 8}%)` }}
              title={`Day ${i + 1}`}
            />
          ))}
        </div>
      </section>
    </JournalShell>
  );
}
