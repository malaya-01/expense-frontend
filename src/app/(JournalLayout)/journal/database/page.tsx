import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalDatabasePage() {
  return (
    <JournalShell activeNav="database" headerTitle="Databases">
      <JournalPageHeader title="Databases" subtitle="Notion-style tables with custom properties">
        <button type="button" className="jrn-btn-primary">New database</button>
      </JournalPageHeader>
      <section className="jrn-card p-0">
        <div className="flex border-b border-slate-200/70 px-3 py-2 dark:border-white/[0.06]">
          <button type="button" className="jrn-btn-ghost text-[10px]">Table</button>
          <button type="button" className="jrn-btn-ghost text-[10px]">Board</button>
          <button type="button" className="jrn-btn-ghost text-[10px]">Gallery</button>
          <button type="button" className="jrn-btn-ghost text-[10px]">Calendar</button>
        </div>
        <div className="jrn-table-wrap rounded-none border-0">
          <table className="jrn-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">Reading list item</td>
                <td><span className="jrn-badge jrn-badge-violet">Reading</span></td>
                <td>Medium</td>
                <td>Jun 15</td>
                <td>books</td>
              </tr>
              <tr>
                <td className="font-medium">Course module 3</td>
                <td><span className="jrn-badge jrn-badge-slate">Not started</span></td>
                <td>High</td>
                <td>Jul 1</td>
                <td>learning</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </JournalShell>
  );
}
