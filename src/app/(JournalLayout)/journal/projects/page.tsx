import Link from "next/link";
import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalProjectsPage() {
  return (
    <JournalShell activeNav="projects" headerTitle="Projects">
      <JournalPageHeader title="Projects" subtitle="Group pages, tasks, and timelines">
        <button type="button" className="jrn-btn-primary">New project</button>
      </JournalPageHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="jrn-card">
          <h3 className="text-sm font-bold">Life OS build</h3>
          <p className="mt-1 text-[10px] text-slate-500">12 pages · 8 open tasks</p>
          <Link href="/journal/kanban" className="jrn-btn-ghost mt-2 px-0 text-violet-600">Open board →</Link>
        </article>
        <article className="jrn-card">
          <h3 className="text-sm font-bold">Career transition</h3>
          <p className="mt-1 text-[10px] text-slate-500">5 pages · 3 open tasks</p>
        </article>
      </div>
    </JournalShell>
  );
}
