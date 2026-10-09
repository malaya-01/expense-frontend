"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CloudUpload,
  RefreshCw,
  Smartphone,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ModuleHeader } from "@/components/ui/module-header";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import {
  offlineDb,
  tableForEntityType,
  type ConflictItem,
  type OutboxItem,
} from "@/lib/offline/db";
import { resolveKeepLocal, resolveKeepRemote } from "@/lib/offline/conflicts";
import {
  diffChange,
  opWording,
  summarizeChange,
  type ChangeSummary,
  type NameLookup,
} from "@/lib/offline/describe-change";
import {
  discardFailedChange,
  explainSyncError,
  listSyncIssues,
  retryFailedChange,
  type SyncIssues,
} from "@/lib/offline/issues";
import { runSync, subscribeSyncStatus } from "@/lib/offline/sync-engine";

async function loadLookup(): Promise<NameLookup> {
  const [accounts, categories, recurring, goals, loans] = await Promise.all([
    offlineDb.accounts.toArray(),
    offlineDb.categories.toArray(),
    offlineDb.recurring.toArray(),
    offlineDb.goals.toArray(),
    offlineDb.loans.toArray(),
  ]);
  const names = new Map<string, string>();
  for (const row of [...recurring, ...goals, ...loans] as Array<Record<string, unknown>>) {
    names.set(String(row.id), String(row.name || ""));
  }
  return {
    accounts: new Map(
      (accounts as Array<Record<string, unknown>>).map((a) => [
        String(a.id),
        { name: String(a.name || ""), currency: String(a.currency || "INR") },
      ]),
    ),
    categories: new Map(
      (categories as Array<Record<string, unknown>>).map((c) => [
        String(c.id),
        String(c.name || ""),
      ]),
    ),
    names,
  };
}

/** The local row is the fullest picture of a refused change. */
async function failedRow(item: OutboxItem): Promise<Record<string, unknown>> {
  const table = tableForEntityType(item.entity_type);
  const local = table ? await offlineDb.table(table).get(item.entity_id) : null;
  return { id: item.entity_id, ...(item.payload || {}), ...(local || {}) };
}

export default function SyncIssuesPage() {
  const { showToast } = useToast();
  const [issues, setIssues] = useState<SyncIssues | null>(null);
  const [lookup, setLookup] = useState<NameLookup | null>(null);
  const [rows, setRows] = useState<Map<number, Record<string, unknown>>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);
  const [discard, setDiscard] = useState<OutboxItem | null>(null);

  const refresh = useCallback(async () => {
    const [next, names] = await Promise.all([listSyncIssues(), loadLookup()]);
    const loaded = new Map<number, Record<string, unknown>>();
    for (const item of next.failed) {
      if (item.id != null) loaded.set(item.id, await failedRow(item));
    }
    setIssues(next);
    setLookup(names);
    setRows(loaded);
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeSyncStatus(() => void refresh());
    window.addEventListener("finos:data-updated", refresh);
    return () => {
      unsubscribe();
      window.removeEventListener("finos:data-updated", refresh);
    };
  }, [refresh]);

  const run = async (key: string, action: () => Promise<void>, done: string) => {
    setBusy(key);
    try {
      await action();
      showToast({ title: done, tone: "success" });
    } catch (error) {
      showToast({
        title: "That didn't work",
        description: error instanceof Error ? error.message : undefined,
        tone: "error",
      });
    } finally {
      setBusy(null);
      await refresh();
    }
  };

  const total = (issues?.failed.length ?? 0) + (issues?.conflicts.length ?? 0);

  return (
    <div>
      <ModuleHeader
        title="Sync issues"
        description="Changes that couldn't be saved to your account. Nothing here is lost — decide what to keep so your balances stay right."
        inlineActions
        actions={
          <Button
            variant="secondary"
            onClick={() => run("sync", () => runSync("manual").then(() => undefined), "Sync finished")}
            loading={busy === "sync"}
          >
            <RefreshCw size={14} />
            Sync now
          </Button>
        }
      />

      {issues && issues.waiting > 0 ? (
        <p className="mb-3 flex items-center gap-2 rounded-[12px] bg-[var(--ds-gray-100)] px-3 py-2.5 text-[12.5px] text-[var(--ds-gray-900)]">
          <CloudUpload size={15} className="shrink-0" aria-hidden />
          {issues.waiting} change{issues.waiting === 1 ? " is" : "s are"} saved on
          this device and waiting to upload. They go up automatically when
          you&apos;re online.
        </p>
      ) : null}

      {!issues || !lookup ? null : total === 0 ? (
        <div className="rounded-[16px] bg-[var(--ds-background-elevated)] px-5 py-10 text-center ds-border">
          <CheckCircle2 size={28} className="mx-auto text-[var(--ds-status-green)]" aria-hidden />
          <p className="mt-3 text-[15px] font-semibold text-[var(--ds-gray-1000)]">
            Everything is in sync
          </p>
          <p className="mt-1 text-[13px] text-[var(--ds-gray-700)]">
            Your balances on this device match your account.
          </p>
          <Link
            href="/ledger"
            className="mt-4 inline-block text-[13px] font-medium text-[var(--ds-status-blue)]"
          >
            Open the ledger
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {issues.conflicts.length ? (
            <section>
              <SectionTitle
                icon={Users}
                title="Changed on two devices"
                hint="The same item was changed here and somewhere else. Pick the version that's right."
              />
              <div className="space-y-2.5">
                {issues.conflicts.map((conflict) => (
                  <ConflictCard
                    key={conflict.id}
                    conflict={conflict}
                    lookup={lookup}
                    busy={busy === `c${conflict.id}`}
                    onKeepMine={() =>
                      run(
                        `c${conflict.id}`,
                        async () => {
                          await resolveKeepLocal(conflict.id!);
                          void runSync("conflict-local");
                        },
                        "Kept this device's version",
                      )
                    }
                    onKeepTheirs={() =>
                      run(
                        `c${conflict.id}`,
                        () => resolveKeepRemote(conflict.id!),
                        "Kept the other version",
                      )
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {issues.failed.length ? (
            <section>
              <SectionTitle
                icon={TriangleAlert}
                title="Couldn't be saved"
                hint="Your account refused these. They are still on this device but not in your balances on other devices."
              />
              <div className="space-y-2.5">
                {issues.failed.map((item) => (
                  <FailedCard
                    key={item.id}
                    item={item}
                    row={rows.get(item.id!) || item.payload}
                    lookup={lookup}
                    busy={busy === `f${item.id}`}
                    onRetry={() =>
                      run(`f${item.id}`, () => retryFailedChange(item), "Sent again")
                    }
                    onDiscard={() => setDiscard(item)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(discard)}
        title="Discard this change?"
        description="It will be removed from this device and your balances will be reloaded from your account. This can't be undone."
        confirmLabel="Discard change"
        destructive
        onClose={() => setDiscard(null)}
        onConfirm={async () => {
          const item = discard;
          setDiscard(null);
          if (item) {
            await run(`f${item.id}`, () => discardFailedChange(item), "Change discarded");
          }
        }}
      />
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Users;
  title: string;
  hint: string;
}) {
  return (
    <div className="mb-2 px-1">
      <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ds-gray-1000)]">
        <Icon size={15} aria-hidden />
        {title}
      </h2>
      <p className="mt-0.5 text-[12px] leading-4 text-[var(--ds-gray-700)]">{hint}</p>
    </div>
  );
}

function SummaryBlock({ summary }: { summary: ChangeSummary }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-[var(--ds-gray-1000)]">
          {summary.title}
        </p>
        {summary.when ? (
          <p className="mt-0.5 text-[12px] text-[var(--ds-gray-700)]">{summary.when}</p>
        ) : null}
        {summary.where ? (
          <p className="mt-0.5 truncate text-[12px] text-[var(--ds-gray-700)]">{summary.where}</p>
        ) : null}
      </div>
      {summary.amount ? (
        <p
          className={cn(
            "shrink-0 text-[15px] font-semibold tabular-nums",
            summary.amount.tone === "in"
              ? "text-[var(--ds-status-green)]"
              : summary.amount.tone === "out"
                ? "text-[var(--ds-status-red)]"
                : "text-[var(--ds-gray-1000)]",
          )}
        >
          {summary.amount.text}
        </p>
      ) : null}
    </div>
  );
}

function ConflictCard({
  conflict,
  lookup,
  busy,
  onKeepMine,
  onKeepTheirs,
}: {
  conflict: ConflictItem;
  lookup: NameLookup;
  busy: boolean;
  onKeepMine: () => void;
  onKeepTheirs: () => void;
}) {
  const mine = conflict.local_row;
  const theirs = conflict.server_row;
  const summary = summarizeChange(conflict.entity_type, mine, lookup);
  const diff = diffChange(conflict.entity_type, mine, theirs, lookup);

  return (
    <article className="rounded-[14px] bg-[var(--ds-background-elevated)] p-3 ds-border sm:p-4">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ds-status-orange)]">
        {summary.kind} · changed on two devices
      </p>
      <SummaryBlock summary={summary} />

      {diff.length ? (
        <div className="mt-3 overflow-hidden rounded-[10px] ds-border">
          <div className="grid grid-cols-[5.5rem_1fr_1fr] bg-[var(--ds-gray-100)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--ds-gray-700)]">
            <span>What</span>
            <span className="flex items-center gap-1">
              <Smartphone size={11} aria-hidden /> This device
            </span>
            <span>Other device</span>
          </div>
          {diff.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[5.5rem_1fr_1fr] gap-x-2 border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_7%,transparent)] px-2.5 py-1.5 text-[12.5px]"
            >
              <span className="text-[var(--ds-gray-700)]">{row.label}</span>
              <span className="min-w-0 break-words font-medium text-[var(--ds-gray-1000)]">
                {row.mine}
              </span>
              <span className="min-w-0 break-words text-[var(--ds-gray-900)]">
                {row.theirs}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-[var(--ds-gray-700)]">
          Both versions look the same — either choice is fine.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="sm" onClick={onKeepMine} disabled={busy}>
          Keep this device&apos;s
        </Button>
        <Button size="sm" variant="secondary" onClick={onKeepTheirs} disabled={busy}>
          Keep the other one
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-[var(--ds-gray-700)]">
        Found {formatDateTime(conflict.created_at)}
      </p>
    </article>
  );
}

function FailedCard({
  item,
  row,
  lookup,
  busy,
  onRetry,
  onDiscard,
}: {
  item: OutboxItem;
  row: Record<string, unknown>;
  lookup: NameLookup;
  busy: boolean;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const summary = summarizeChange(item.entity_type, row, lookup);
  return (
    <article className="rounded-[14px] bg-[var(--ds-background-elevated)] p-3 ds-border sm:p-4">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ds-status-red)]">
        {opWording(item.op)} {summary.kind.toLowerCase()} · not saved
      </p>
      <SummaryBlock summary={summary} />
      <p className="mt-2.5 rounded-[10px] bg-[color-mix(in_srgb,var(--ds-status-red)_9%,transparent)] px-2.5 py-2 text-[12.5px] leading-5 text-[var(--ds-gray-1000)]">
        <span className="font-medium">Why: </span>
        {explainSyncError(item.last_error)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="sm" onClick={onRetry} disabled={busy}>
          Try again
        </Button>
        <Button size="sm" variant="secondary" onClick={onDiscard} disabled={busy}>
          Discard
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-[var(--ds-gray-700)]">
        Tried {item.retry_count} time{item.retry_count === 1 ? "" : "s"} · last{" "}
        {formatDateTime(item.updated_at)}. Fix the cause first (for example add
        the missing money to the account), then tap Try again.
      </p>
    </article>
  );
}
