import Link from "next/link";
import { JournalShell } from "../../_components/JournalShell";

/**
 * Notion-style block editor shell — static blocks for UI reference.
 * TODO: Implement block model { id, type, content, children } + drag reorder.
 * TODO: Slash command menu (/) for block types.
 * TODO: Auto-save PATCH /journal/pages/:id/blocks every 2s.
 */
export default function JournalEditorPage() {
  return (
    <JournalShell activeNav="editor" headerTitle="Untitled" breadcrumbs="Life OS / Q2 career goals" wide>
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Page icon + title */}
        <button type="button" className="text-4xl" title="Change icon">🎯</button>
        <h1
          className="jrn-block jrn-block-h1 mt-2"
          contentEditable
          suppressContentEditableWarning
          suppressHydrationWarning
          data-placeholder="Untitled"
        >
          Q2 career goals
        </h1>

        {/* Toolbar */}
        <div className="sticky top-0 z-10 -mx-2 mb-4 flex flex-wrap gap-1 rounded-md border border-slate-200/60 bg-white/90 px-2 py-1 backdrop-blur dark:border-white/[0.06] dark:bg-[#252525]/90">
          <button type="button" className="jrn-btn-ghost text-[10px]">Bold</button>
          <button type="button" className="jrn-btn-ghost text-[10px]">H1</button>
          <button type="button" className="jrn-btn-ghost text-[10px]">Bullet</button>
          <button type="button" className="jrn-btn-ghost text-[10px]">Todo</button>
          <button type="button" className="jrn-btn-ghost text-[10px]">Callout</button>
          <button type="button" className="jrn-btn-ghost text-[10px]">Link page</button>
          <span className="ml-auto text-[10px] text-slate-400">Saved · TODO: live status</span>
        </div>

        {/* Blocks */}
        <div className="space-y-2">
          <p className="jrn-block" contentEditable suppressContentEditableWarning suppressHydrationWarning data-placeholder="Type '/' for commands">
            Define what success looks like for Q2 as a working professional balancing finance tracking and personal growth.
          </p>
          <h2 className="jrn-block jrn-block-h2" contentEditable suppressContentEditableWarning suppressHydrationWarning>
            Key results
          </h2>
          <ul className="ml-4 list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
            <li className="jrn-block" contentEditable suppressContentEditableWarning suppressHydrationWarning>Ship expense tracker MVP</li>
            <li className="jrn-block" contentEditable suppressContentEditableWarning suppressHydrationWarning>Journal 5 days per week</li>
            <li className="jrn-block" contentEditable suppressContentEditableWarning suppressHydrationWarning>Read 2 books on investing</li>
          </ul>
          <div className="jrn-block-callout">
            💡 <strong>Tip:</strong> Link this page to your{" "}
            <Link href="/expense/dashboard" className="text-violet-600 underline">
              Expense Tracker
            </Link>{" "}
            budget goals when you wire integrations.
          </div>
          <blockquote className="jrn-block jrn-block-quote" contentEditable suppressContentEditableWarning suppressHydrationWarning>
            &quot;We suffer more in imagination than in reality.&quot; — Seneca
          </blockquote>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 rounded" />
            <span className="jrn-block" contentEditable suppressContentEditableWarning suppressHydrationWarning>
              Review OKRs with manager
            </span>
          </label>
          <p className="jrn-block text-slate-400" data-placeholder="Press Enter to add a block…">
            /
          </p>
        </div>

        {/* Comments / backlinks — Notion features */}
        <footer className="mt-12 border-t border-slate-200/70 pt-4 dark:border-white/[0.06]">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Backlinks</p>
          <p className="mt-1 text-xs text-slate-400">None yet · TODO: GET /journal/pages/:id/backlinks</p>
        </footer>
      </div>
    </JournalShell>
  );
}
