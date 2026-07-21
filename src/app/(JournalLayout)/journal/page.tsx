import Link from "next/link";
import { JournalPageHeader } from "../_components/JournalPageHeader";
import { JournalShell } from "../_components/JournalShell";

export default function JournalHomePage() {
  return (
    <JournalShell activeNav="home" headerTitle="Home">
      <JournalPageHeader title="Good afternoon, Jane" subtitle="Your personal knowledge workspace">
        <Link href="/journal/editor" className="jrn-btn-primary">New page</Link>
      </JournalPageHeader>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/journal/daily" className="jrn-card hover:border-violet-300 dark:hover:border-violet-700">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Today</p>
          <p className="mt-1 text-sm font-semibold">Daily journal</p>
          <p className="mt-1 text-[10px] text-slate-400">Not started · May 30</p>
        </Link>
        <Link href="/journal/tasks" className="jrn-card">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Tasks</p>
          <p className="mt-1 text-sm font-semibold">5 due today</p>
        </Link>
        <Link href="/journal/goals" className="jrn-card">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Goals</p>
          <p className="mt-1 text-sm font-semibold">Q2 OKRs · 68%</p>
        </Link>
        <Link href="/journal/habits" className="jrn-card">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Habits</p>
          <p className="mt-1 text-sm font-semibold">4/6 completed</p>
        </Link>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="jrn-card">
          <h2 className="text-xs font-bold">Recently edited</h2>
          <ul className="mt-3 space-y-1">
            <li><Link href="/journal/editor" className="jrn-doc-row"><span>📄</span> Q2 career goals</Link></li>
            <li><Link href="/journal/editor" className="jrn-doc-row"><span>📄</span> Meeting — Product sync</Link></li>
            <li><Link href="/journal/editor" className="jrn-doc-row"><span>📄</span> Reading: Atomic Habits</Link></li>
          </ul>
        </section>
        <section className="jrn-card">
          <h2 className="text-xs font-bold">Quick capture</h2>
          {/* TODO: POST /journal/inbox — quick note without picking a page */}
          <textarea className="jrn-input mt-2 min-h-[80px]" placeholder="Jot something down…" />
          <button type="button" className="jrn-btn-primary mt-2">Save to inbox</button>
        </section>
      </div>
    </JournalShell>
  );
}
