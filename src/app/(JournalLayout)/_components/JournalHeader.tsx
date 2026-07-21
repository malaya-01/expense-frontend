import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type JournalHeaderProps = {
  title?: string;
  breadcrumbs?: string;
};

export function JournalHeader({ title = "Home", breadcrumbs }: JournalHeaderProps) {
  return (
    <header className="jrn-header">
      <div className="flex min-w-0 items-center gap-2">
        <label htmlFor="jrn-nav-toggle" className="jrn-btn-ghost cursor-pointer lg:hidden" aria-label="Menu">
          <svg className="size-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </label>
        <label htmlFor="jrn-collapse" className="jrn-btn-ghost hidden cursor-pointer lg:inline-flex" title="Collapse sidebar">
          <svg className="size-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </label>
        <div className="min-w-0">
          {breadcrumbs && (
            <p className="truncate text-[10px] text-slate-400">{breadcrumbs}</p>
          )}
          <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{title}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Link href="/journal/search" className="jrn-btn-ghost hidden sm:inline-flex" title="Search">
          <svg className="size-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </Link>
        <ThemeToggle />
        <Link href="/choose-app" className="jrn-btn-secondary hidden sm:inline-flex">
          Switch app
        </Link>
        <Link href="/journal/editor" className="jrn-btn-primary">
          New page
        </Link>
      </div>
    </header>
  );
}
