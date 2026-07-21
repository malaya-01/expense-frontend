import { ExpensePageHeader } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function InsightsPage() {
  return (
    <ExpenseShell activeNav="insights" headerTitle="AI Insights">
      <ExpensePageHeader
        title="AI Insights"
        subtitle="Smart recommendations powered by your spending data"
      />

      {/* Coming soon banner */}
      <section className="dash-card mb-6 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:border-emerald-800 dark:from-emerald-950/40 dark:to-teal-950/40">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl dark:bg-emerald-500/20">
            ✨
          </span>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900 dark:text-white">AI features coming soon</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              You&apos;ll implement the backend AI service later — this page shows the UI shell.
            </p>
          </div>
          <span className="dash-badge dash-badge-amber">Planned</span>
        </div>
      </section>

      {/* Preview insight cards — static placeholders */}
      {/* TODO: Fetch from GET /ai/insights when backend is ready */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="dash-card border-l-4 border-l-amber-500">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="dash-badge dash-badge-amber">Alert</span>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Transport over budget</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            You&apos;ve exceeded your transport budget by $20 this month. Consider carpooling or public transit.
          </p>
          {/* TODO: onClick → dismiss insight PATCH /ai/insights/:id/dismiss */}
          <button type="button" className="dash-btn-ghost mt-3 px-0 text-xs text-emerald-600 dark:text-emerald-400">
            View transport expenses →
          </button>
        </article>

        <article className="dash-card border-l-4 border-l-emerald-500">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">💡</span>
            <span className="dash-badge dash-badge-emerald">Tip</span>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Subscription audit</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            You have 4 recurring subscriptions totalling $67/month. Review unused services to save ~$20.
          </p>
          <button type="button" className="dash-btn-ghost mt-3 px-0 text-xs text-emerald-600 dark:text-emerald-400">
            Review subscriptions →
          </button>
        </article>

        <article className="dash-card border-l-4 border-l-indigo-500">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">📈</span>
            <span className="dash-badge dash-badge-slate">Trend</span>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Spending down 8%</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Your grocery spending decreased compared to last month. Great progress toward your savings goal!
          </p>
          <button type="button" className="dash-btn-ghost mt-3 px-0 text-xs text-emerald-600 dark:text-emerald-400">
            See grocery report →
          </button>
        </article>
      </section>

      {/* Chat-style AI assistant placeholder */}
      <section className="dash-card mt-6">
        <h2 className="mb-1 text-sm font-bold text-slate-900 dark:text-white">Ask your finance assistant</h2>
        <p className="mb-4 text-xs text-slate-500">Natural language queries about your spending</p>

        <div className="mb-4 max-h-48 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm shadow-sm dark:bg-slate-800">
            {/* TODO: Render messages from chat state — POST /ai/chat { message } */}
            Hi! Ask me anything about your expenses, like &quot;How much did I spend on food this month?&quot;
          </div>
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-emerald-600 px-4 py-2.5 text-sm text-white">
            How much did I spend on groceries in May?
          </div>
          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm shadow-sm dark:bg-slate-800">
            You spent <strong className="font-mono">$680.40</strong> on groceries in May across 12 transactions.
          </div>
        </div>

        <form className="flex gap-2">
          {/* TODO: onSubmit → send message to AI API, append to chat, show loading state */}
          <input
            type="text"
            placeholder="Ask about your finances…"
            className="dash-input flex-1"
            disabled
          />
          <button type="button" className="dash-btn-primary shrink-0" disabled>
            Send
          </button>
        </form>
        <p className="mt-2 text-[10px] text-slate-400">Enable when AI backend is connected</p>
      </section>
    </ExpenseShell>
  );
}
