import Link from "next/link";
import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalMeetingsPage() {
  return (
    <JournalShell activeNav="meetings" headerTitle="Meetings">
      <JournalPageHeader title="Meeting notes" subtitle="Agenda, attendees, decisions, action items">
        <button type="button" className="jrn-btn-primary">New meeting</button>
      </JournalPageHeader>
      <section className="jrn-card">
        <article className="border-b border-slate-100 py-3 last:border-0 dark:border-white/[0.04]">
          <Link href="/journal/editor" className="text-sm font-semibold hover:text-violet-600">
            Product sync — May 28
          </Link>
          <p className="mt-1 text-[10px] text-slate-500">Attendees: Alex, Jane · 3 action items</p>
        </article>
        <article className="py-3">
          <Link href="/journal/editor" className="text-sm font-semibold">1:1 with manager</Link>
          <p className="mt-1 text-[10px] text-slate-500">May 20 · Career goals discussed</p>
        </article>
      </section>
    </JournalShell>
  );
}
