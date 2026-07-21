import Link from "next/link";
import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalSearchPage() {
  return (
    <JournalShell activeNav="search" headerTitle="Search">
      <JournalPageHeader title="Search" subtitle="Find anything in your workspace" />
      <input
        type="search"
        className="jrn-input text-sm"
        placeholder="Search pages, tasks, goals…"
        autoFocus
      />
      {/* TODO: Debounced GET /journal/search?q= */}
      <section className="jrn-card mt-4">
        <p className="text-[10px] font-semibold uppercase text-slate-500">Pages</p>
        <Link href="/journal/editor" className="jrn-doc-row mt-1">
          <span>📄</span> Q2 career goals
        </Link>
        <p className="mt-3 text-[10px] font-semibold uppercase text-slate-500">Tasks</p>
        <p className="jrn-doc-row mt-1">☑ Review OKRs with manager</p>
      </section>
    </JournalShell>
  );
}
