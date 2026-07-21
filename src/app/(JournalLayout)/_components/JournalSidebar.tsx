import Link from "next/link";

export type JournalNavKey =
  | "home"
  | "notes"
  | "editor"
  | "daily"
  | "goals"
  | "tasks"
  | "habits"
  | "projects"
  | "kanban"
  | "database"
  | "calendar"
  | "templates"
  | "meetings"
  | "mood"
  | "favorites"
  | "trash"
  | "search"
  | "settings";

type JournalSidebarProps = {
  active?: JournalNavKey;
};

function nav(active: boolean) {
  return active ? "jrn-nav-link jrn-nav-link-active" : "jrn-nav-link";
}

function I({ children }: { children: React.ReactNode }) {
  return <span className="flex size-[18px] shrink-0 items-center justify-center [&>svg]:size-[18px]">{children}</span>;
}

export function JournalSidebar({ active = "home" }: JournalSidebarProps) {
  return (
    <aside className="jrn-sidebar">
      <div className="jrn-sidebar-header flex h-11 shrink-0 items-center gap-2 border-b border-slate-200/70 px-3 dark:border-white/[0.06]">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-violet-600 text-sm text-white">
          📓
        </span>
        <div className="jrn-brand-text min-w-0 jrn-nav-label">
          <p className="truncate text-xs font-bold text-slate-900 dark:text-white">Journal</p>
          <p className="text-[9px] text-slate-400">Notion-style workspace</p>
        </div>
      </div>

      <div className="jrn-workspace-picker mx-2 mt-2">
        <button type="button" className="jrn-input flex items-center justify-between text-left">
          <span className="truncate">Personal workspace</span>
          <span className="text-slate-400">▾</span>
        </button>
        {/* TODO: Workspace switcher dropdown — multi workspace like Notion */}
      </div>

      <nav className="jrn-sidebar-nav space-y-0.5">
        <Link href="/journal/search" className={nav(active === "search")} title="Search">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </I>
          <span className="jrn-nav-label">Search</span>
        </Link>
        <Link href="/journal" className={nav(active === "home")} title="Home">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </I>
          <span className="jrn-nav-label">Home</span>
        </Link>
        <Link href="/journal/favorites" className={nav(active === "favorites")} title="Favorites">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </I>
          <span className="jrn-nav-label">Favorites</span>
        </Link>

        <p className="jrn-nav-section jrn-nav-label">Write</p>
        <Link href="/journal/notes" className={nav(active === "notes")} title="All pages">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </I>
          <span className="jrn-nav-label">All pages</span>
        </Link>
        <Link href="/journal/editor" className={nav(active === "editor")} title="Editor">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </I>
          <span className="jrn-nav-label">Block editor</span>
        </Link>
        <Link href="/journal/daily" className={nav(active === "daily")} title="Daily journal">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </I>
          <span className="jrn-nav-label">Daily journal</span>
        </Link>
        <Link href="/journal/templates" className={nav(active === "templates")} title="Templates">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </I>
          <span className="jrn-nav-label">Templates</span>
        </Link>
        <Link href="/journal/meetings" className={nav(active === "meetings")} title="Meeting notes">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </I>
          <span className="jrn-nav-label">Meetings</span>
        </Link>

        <p className="jrn-nav-section jrn-nav-label">Plan</p>
        <Link href="/journal/goals" className={nav(active === "goals")} title="Goals">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </I>
          <span className="jrn-nav-label">Goals &amp; OKRs</span>
        </Link>
        <Link href="/journal/tasks" className={nav(active === "tasks")} title="Tasks">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </I>
          <span className="jrn-nav-label">Tasks</span>
        </Link>
        <Link href="/journal/habits" className={nav(active === "habits")} title="Habits">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </I>
          <span className="jrn-nav-label">Habits</span>
        </Link>
        <Link href="/journal/projects" className={nav(active === "projects")} title="Projects">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </I>
          <span className="jrn-nav-label">Projects</span>
        </Link>
        <Link href="/journal/kanban" className={nav(active === "kanban")} title="Kanban">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
            </svg>
          </I>
          <span className="jrn-nav-label">Kanban</span>
        </Link>
        <Link href="/journal/database" className={nav(active === "database")} title="Database">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </I>
          <span className="jrn-nav-label">Databases</span>
        </Link>
        <Link href="/journal/calendar" className={nav(active === "calendar")} title="Calendar">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </I>
          <span className="jrn-nav-label">Calendar</span>
        </Link>
        <Link href="/journal/mood" className={nav(active === "mood")} title="Mood">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </I>
          <span className="jrn-nav-label">Mood tracker</span>
        </Link>

        <p className="jrn-nav-section jrn-nav-label">Organize</p>
        <p className="px-2 py-1 text-[10px] text-slate-400 jrn-nav-label">📁 Life OS</p>
        <Link href="/journal/notes" className="jrn-doc-row jrn-nav-label">
          <span>📄</span> Career roadmap
        </Link>
        <Link href="/journal/notes" className="jrn-doc-row jrn-nav-label">
          <span>📄</span> Reading list
        </Link>
        <Link href="/journal/trash" className={nav(active === "trash")} title="Trash">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </I>
          <span className="jrn-nav-label">Trash</span>
        </Link>
        <Link href="/journal/settings" className={nav(active === "settings")} title="Settings">
          <I>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </I>
          <span className="jrn-nav-label">Settings</span>
        </Link>
      </nav>

      <div className="shrink-0 border-t border-slate-200/70 p-2 dark:border-white/[0.06]">
        <div className="flex items-center gap-2 rounded-md bg-black/[0.03] p-2 dark:bg-white/[0.04]">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-700 dark:text-violet-300">
            JD
          </span>
          <div className="jrn-user-meta min-w-0 flex-1 jrn-nav-label">
            <p className="truncate text-xs font-semibold">Jane Doe</p>
          </div>
        </div>
        <Link href="/choose-app" className="jrn-btn-ghost mt-1.5 w-full justify-start px-2 text-[10px]">
          <span className="jrn-nav-label">Switch to Expense Tracker</span>
        </Link>
        <Link href="/signin" className="jrn-signout-btn jrn-btn-ghost mt-1 w-full justify-start px-2" title="Sign out">
          <span className="jrn-signout-text jrn-nav-label">Sign out</span>
        </Link>
      </div>
    </aside>
  );
}
