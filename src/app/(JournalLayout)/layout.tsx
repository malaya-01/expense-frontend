/**
 * Journal app route group — completely separate from (ExpenseLayout) / expense tracker.
 * URLs: /journal, /journal/notes, /journal/editor, …
 *
 * TODO: Auth guard — same session as expense app but separate permission scope if needed.
 */

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
