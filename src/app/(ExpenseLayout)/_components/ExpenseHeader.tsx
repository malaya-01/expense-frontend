import { ThemeToggle } from "@/components/theme/ThemeToggle";

type ExpenseHeaderProps = {
  title?: string;
};

export function ExpenseHeader({ title = "Dashboard" }: ExpenseHeaderProps) {
  return (
    <header className="dash-header">
      <div className="flex min-w-0 items-center gap-2">
        <label htmlFor="dash-nav-toggle" className="dash-btn-ghost cursor-pointer lg:hidden" aria-label="Open menu">
          <svg className="size-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </label>

        {/* TODO: Persist collapse preference in localStorage when you add client logic */}
        <label
          htmlFor="dash-collapse"
          className="dash-btn-ghost hidden cursor-pointer lg:inline-flex"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <svg className="size-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </label>

        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400">May 2026</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="relative hidden md:block">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="search" placeholder="Search…" className="dash-input w-36 pl-8 lg:w-44" />
        </div>

        <ThemeToggle />

        <button type="button" className="dash-btn-ghost relative" aria-label="Notifications">
          <svg className="size-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute right-1 top-1 size-1.5 rounded-full bg-rose-500" />
        </button>

        <button type="button" className="dash-btn-primary hidden sm:inline-flex">
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>
    </header>
  );
}
