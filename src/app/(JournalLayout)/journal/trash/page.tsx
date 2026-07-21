import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalTrashPage() {
  return (
    <JournalShell activeNav="trash" headerTitle="Trash">
      <JournalPageHeader title="Trash" subtitle="Deleted pages — restore or delete forever">
        <button type="button" className="jrn-btn-secondary text-rose-600">Empty trash</button>
      </JournalPageHeader>
      <p className="text-xs text-slate-500">No deleted pages · TODO: GET /journal/trash</p>
    </JournalShell>
  );
}
