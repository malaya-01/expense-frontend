import { ExpenseHeader } from "./ExpenseHeader";
import { ExpenseSidebar, type ExpenseNavKey } from "./ExpenseSidebar";

type ExpenseShellProps = {
  children: React.ReactNode;
  headerTitle?: string;
  activeNav?: ExpenseNavKey;
};

export function ExpenseShell({
  children,
  headerTitle = "Dashboard",
  activeNav = "home",
}: ExpenseShellProps) {
  return (
    <>
      <input type="checkbox" id="dash-nav-toggle" className="hidden" aria-hidden="true" />
      <input type="checkbox" id="dash-collapse" className="hidden" aria-hidden="true" />

      <div className="dash-shell">
        <ExpenseSidebar active={activeNav} />
        <label htmlFor="dash-nav-toggle" className="dash-overlay" aria-hidden="true" />

        <div className="dash-main">
          <ExpenseHeader title={headerTitle} />
          <main className="dash-content">{children}</main>
        </div>
      </div>
    </>
  );
}
