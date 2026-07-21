import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalKanbanPage() {
  return (
    <JournalShell activeNav="kanban" headerTitle="Kanban" wide>
      <div className="jrn-page-wide">
        <JournalPageHeader title="Kanban board" subtitle="Life OS build">
          <button type="button" className="jrn-btn-primary">Add card</button>
        </JournalPageHeader>
        {/* TODO: Drag-drop columns — POST /journal/kanban/move */}
        <div className="flex gap-3 overflow-x-auto pb-4">
          <div className="jrn-kanban-col">
            <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">Backlog</p>
            <div className="jrn-kanban-card">Design block editor toolbar</div>
            <div className="jrn-kanban-card">Slash command menu</div>
          </div>
          <div className="jrn-kanban-col">
            <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">In progress</p>
            <div className="jrn-kanban-card">Journal sidebar nav</div>
          </div>
          <div className="jrn-kanban-col">
            <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">Done</p>
            <div className="jrn-kanban-card">App chooser page</div>
          </div>
        </div>
      </div>
    </JournalShell>
  );
}
