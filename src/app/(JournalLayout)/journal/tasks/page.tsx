import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalTasksPage() {
  return (
    <JournalShell activeNav="tasks" headerTitle="Tasks">
      <JournalPageHeader title="Tasks" subtitle="To-dos linked to pages and projects">
        <button type="button" className="jrn-btn-primary">Add task</button>
      </JournalPageHeader>

      <section className="jrn-card">
        <h2 className="mb-2 text-xs font-bold">Today</h2>
        <ul className="space-y-1">
          <li className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-black/[0.03]">
            <input type="checkbox" />
            <span>Wire journal block editor</span>
            <span className="jrn-badge jrn-badge-violet ml-auto">High</span>
          </li>
          <li className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs">
            <input type="checkbox" defaultChecked />
            <span className="line-through text-slate-400">Review expense dashboard UI</span>
          </li>
        </ul>
        <h2 className="mb-2 mt-4 text-xs font-bold">Upcoming</h2>
        <ul className="space-y-1 text-xs text-slate-600">
          <li className="flex items-center gap-2 px-2 py-1.5"><input type="checkbox" /> Prepare 1:1 notes</li>
          <li className="flex items-center gap-2 px-2 py-1.5"><input type="checkbox" /> Weekly review — Sunday</li>
        </ul>
      </section>
    </JournalShell>
  );
}
