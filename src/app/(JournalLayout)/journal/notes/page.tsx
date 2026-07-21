import Link from "next/link";
import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalNotesPage() {
  return (
    <JournalShell activeNav="notes" headerTitle="All pages" breadcrumbs="Workspace / Pages">
      <JournalPageHeader title="All pages" subtitle="Every document in your workspace">
        <button type="button" className="jrn-btn-secondary">Filter</button>
        <Link href="/journal/editor" className="jrn-btn-primary">New page</Link>
      </JournalPageHeader>

      {/* TODO: GET /journal/pages?sort=updated — grid or list view toggle */}
      <div className="mb-4 flex gap-2">
        <input type="search" className="jrn-input max-w-xs" placeholder="Filter pages…" />
        <select className="jrn-input w-auto">
          <option>Last edited</option>
          <option>Created</option>
          <option>A–Z</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/journal/editor" className="jrn-card block hover:ring-2 hover:ring-violet-400/30">
          <span className="text-2xl">📄</span>
          <h3 className="mt-2 text-sm font-semibold">Q2 career goals</h3>
          <p className="mt-1 text-[10px] text-slate-500">Edited 2h ago · Life OS</p>
        </Link>
        <Link href="/journal/editor" className="jrn-card block">
          <span className="text-2xl">📓</span>
          <h3 className="mt-2 text-sm font-semibold">Daily — May 29</h3>
          <p className="mt-1 text-[10px] text-slate-500">Edited yesterday</p>
        </Link>
        <Link href="/journal/editor" className="jrn-card block">
          <span className="text-2xl">👥</span>
          <h3 className="mt-2 text-sm font-semibold">1:1 with manager</h3>
          <p className="mt-1 text-[10px] text-slate-500">Meetings</p>
        </Link>
      </div>
    </JournalShell>
  );
}
