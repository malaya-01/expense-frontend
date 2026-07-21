import { JournalHeader } from "./JournalHeader";
import { JournalSidebar, type JournalNavKey } from "./JournalSidebar";

type JournalShellProps = {
  children: React.ReactNode;
  headerTitle?: string;
  breadcrumbs?: string;
  activeNav?: JournalNavKey;
  /** Full-width layout (editor, kanban) — no max-width page container */
  wide?: boolean;
};

export function JournalShell({
  children,
  headerTitle = "Home",
  breadcrumbs,
  activeNav = "home",
  wide = false,
}: JournalShellProps) {
  return (
    <>
      <input type="checkbox" id="jrn-nav-toggle" className="hidden" aria-hidden="true" />
      <input type="checkbox" id="jrn-collapse" className="hidden" aria-hidden="true" />

      <div className="jrn-shell">
        <JournalSidebar active={activeNav} />
        <label htmlFor="jrn-nav-toggle" className="jrn-overlay" aria-hidden="true" />

        <div className="jrn-main">
          <JournalHeader title={headerTitle} breadcrumbs={breadcrumbs} />
          <main className={`jrn-content ${wide ? "" : ""}`}>
            {wide ? children : <div className="jrn-page">{children}</div>}
          </main>
        </div>
      </div>
    </>
  );
}
