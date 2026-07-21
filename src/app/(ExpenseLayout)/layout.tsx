/**
 * Expense app route group — completely separate from (JournalLayout) / journal.
 * URLs: /expense, /expense/dashboard, /expense/ledger, …
 *
 * TODO: Auth guard — same session as journal app but separate permission scope if needed.
 */

export default function ExpenseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
