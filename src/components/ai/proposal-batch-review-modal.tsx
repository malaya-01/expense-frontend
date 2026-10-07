"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProposalPayloadView } from "@/components/ai/proposal-payload-view";
import { useModulePermissions } from "@/components/permissions/permission-gate";
import { cn } from "@/lib/cn";
import type { ProposalDecisionRun } from "@/lib/ai/proposal-bulk-progress";
import type { AiActionProposal } from "@/types";

export function ProposalBatchReviewModal({
  open,
  proposals,
  busy,
  run,
  onClose,
  onDecide,
  onReviewOne,
}: {
  open: boolean;
  proposals: AiActionProposal[];
  busy: boolean;
  run: ProposalDecisionRun | null;
  onClose: () => void;
  onDecide: (decision: {
    confirm_ids: string[];
    reject_ids: string[];
  }) => void | Promise<void>;
  onReviewOne: (proposal: AiActionProposal) => void;
}) {
  const perms = useModulePermissions("ai");
  const pending = useMemo(
    () => proposals.filter((p) => p.status === "pending"),
    [proposals],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const callingRef = useRef<HTMLLIElement | null>(null);

  const applying = Boolean(run);
  const runFinished = Boolean(run && run.done >= run.total && run.total > 0);

  useEffect(() => {
    if (!open) return;
    if (applying) return;
    setSelected(new Set(pending.map((p) => p.id)));
    setExpandedId(null);
  }, [open, pending, applying]);

  useEffect(() => {
    if (!applying) return;
    callingRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [applying, run?.done]);

  const allIds = pending.map((p) => p.id);
  const selectedIds = allIds.filter((id) => selected.has(id));
  const unselectedIds = allIds.filter((id) => !selected.has(id));
  const allSelected =
    pending.length > 0 && selectedIds.length === pending.length;

  function toggle(id: string) {
    if (applying) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (applying) return;
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  const overallPct =
    run && run.total > 0 ? Math.round((run.done / run.total) * 100) : 0;
  const title = run
    ? runFinished
      ? run.failed
        ? `Finished with ${run.failed} failed`
        : `Applied ${run.confirmed + run.rejected} action${run.confirmed + run.rejected === 1 ? "" : "s"}`
      : `Applying ${Math.min(run.done + 1, run.total)} of ${run.total}`
    : `Review ${pending.length} pending action${pending.length === 1 ? "" : "s"}`;

  function handleClose() {
    if (busy && !runFinished) return;
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      className="max-w-2xl"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {run ? (
            <p className="text-[11px] leading-4 text-[var(--ds-gray-700)]">
              {runFinished
                ? `${run.confirmed} applied · ${run.rejected} rejected · ${run.failed} failed`
                : `Calling APIs one by one. ${run.done}/${run.total} finished.`}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !perms.create || !pending.length}
                onClick={() =>
                  void onDecide({
                    confirm_ids: allIds,
                    reject_ids: [],
                  })
                }
              >
                Approve all
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || !perms.create || !pending.length}
                onClick={() =>
                  void onDecide({
                    confirm_ids: [],
                    reject_ids: allIds,
                  })
                }
              >
                Reject all
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {!run ? (
              <>
                <Button
                  size="sm"
                  disabled={busy || !perms.create || !selectedIds.length}
                  onClick={() =>
                    void onDecide({
                      confirm_ids: selectedIds,
                      reject_ids: unselectedIds,
                    })
                  }
                >
                  Approve selected · reject rest
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || !perms.create || !selectedIds.length}
                  onClick={() =>
                    void onDecide({
                      confirm_ids: unselectedIds,
                      reject_ids: selectedIds,
                    })
                  }
                >
                  Reject selected · approve rest
                </Button>
              </>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              disabled={busy && !runFinished}
              onClick={handleClose}
            >
              {runFinished ? "Done" : "Close"}
            </Button>
          </div>
        </div>
      }
    >
      {run ? (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--ds-gray-700)]">
              <span>
                {runFinished ? "All API calls finished." : "Applying actions…"}
              </span>
              <span>
                {run.done}/{run.total} · {overallPct}%
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--ds-gray-200)]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={overallPct}
              aria-label="Bulk apply progress"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  run.failed && runFinished
                    ? "bg-[var(--ds-status-red)]"
                    : "bg-[var(--ds-focus-color)]",
                )}
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>

          <ul className="max-h-[min(420px,55vh)] space-y-2 overflow-y-auto pr-1">
            {run.items.map((item) => {
              const proposal = proposals.find((row) => row.id === item.id);
              const expanded = expandedId === item.id;
              const calling = item.phase === "calling";
              return (
                <li
                  key={item.id}
                  ref={calling ? callingRef : undefined}
                  id={`proposal-run-${item.id}`}
                  className={cn(
                    "rounded-[12px] border bg-[var(--ds-background-100)] p-3",
                    item.phase === "success" &&
                      "border-[color-mix(in_srgb,var(--ds-status-green)_40%,var(--ds-gray-200))]",
                    item.phase === "error" &&
                      "border-[color-mix(in_srgb,var(--ds-status-red)_45%,var(--ds-gray-200))]",
                    item.phase === "calling" &&
                      "border-[color-mix(in_srgb,var(--ds-focus-color)_45%,var(--ds-gray-200))]",
                    item.phase === "queued" && "border-[var(--ds-gray-200)]",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                        item.phase === "success" &&
                          "bg-[color-mix(in_srgb,var(--ds-status-green)_18%,transparent)] text-[var(--ds-status-green)]",
                        item.phase === "error" &&
                          "bg-[color-mix(in_srgb,var(--ds-status-red)_16%,transparent)] text-[var(--ds-status-red)]",
                        item.phase === "calling" &&
                          "text-[var(--ds-focus-color)]",
                        item.phase === "queued" && "text-[var(--ds-gray-500)]",
                      )}
                      aria-hidden
                    >
                      {item.phase === "success" ? (
                        <Check size={13} strokeWidth={2.5} />
                      ) : item.phase === "error" ? (
                        <CircleAlert size={13} />
                      ) : item.phase === "calling" ? (
                        <LoaderCircle size={13} className="animate-spin" />
                      ) : (
                        <span className="size-2 rounded-full bg-[var(--ds-gray-300)]" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
                            {item.action === "reject" ? "Reject · " : ""}
                            {item.title}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] leading-4 text-[var(--ds-gray-700)]">
                            {item.endpoint}
                          </p>
                        </div>
                        {proposal ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy && !runFinished}
                            onClick={() =>
                              setExpandedId(expanded ? null : item.id)
                            }
                          >
                            {expanded ? "Hide" : "Details"}
                          </Button>
                        ) : null}
                      </div>

                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--ds-gray-200)]">
                        {item.phase === "calling" ? (
                          <span className="api-loader-track block h-full">
                            <span className="api-loader-bar block h-full w-1/3 rounded-full bg-[var(--ds-focus-color)]" />
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "block h-full rounded-full transition-[width] duration-300",
                              item.phase === "success" &&
                                "w-full bg-[var(--ds-status-green)]",
                              item.phase === "error" &&
                                "w-full bg-[var(--ds-status-red)]",
                              item.phase === "queued" && "w-0",
                            )}
                          />
                        )}
                      </div>

                      <p
                        className={cn(
                          "mt-1.5 text-[11px] leading-4",
                          item.phase === "error"
                            ? "text-[var(--ds-status-red)]"
                            : item.phase === "success"
                              ? "text-[var(--ds-gray-800)]"
                              : "text-[var(--ds-gray-700)]",
                        )}
                      >
                        {item.phase === "queued"
                          ? `Waiting · ${item.actionType}`
                          : item.phase === "calling"
                            ? `Calling now · ${item.actionType}`
                            : item.phase === "error"
                              ? item.error || "Request failed"
                              : item.resultText || "OK"}
                      </p>

                      {expanded && proposal ? (
                        <div className="mt-2 rounded-[8px] bg-[var(--ds-background-elevated)] p-1">
                          <ProposalPayloadView proposal={proposal} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : !pending.length ? (
        <p className="text-sm text-[var(--ds-gray-700)]">
          No pending actions left to review.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-[var(--ds-gray-800)]">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="size-3.5 accent-[var(--ds-focus-color)]"
              />
              Select all ({selectedIds.length}/{pending.length})
            </label>
            <p className="text-[11px] text-[var(--ds-gray-700)]">
              Check items, then use bulk actions below. You can still open one
              for detail.
            </p>
          </div>

          <ul className="max-h-[min(420px,55vh)] space-y-2 overflow-y-auto pr-1">
            {pending.map((proposal) => {
              const checked = selected.has(proposal.id);
              const expanded = expandedId === proposal.id;
              return (
                <li
                  key={proposal.id}
                  className={cn(
                    "rounded-[12px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] p-3",
                    checked &&
                      "border-[color-mix(in_srgb,var(--ds-focus-color)_35%,var(--ds-gray-200))]",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(proposal.id)}
                      className="mt-1 size-3.5 shrink-0 accent-[var(--ds-focus-color)]"
                      aria-label={`Select ${proposal.title}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
                            {proposal.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[var(--ds-gray-700)]">
                            <code>{proposal.action_type}</code>
                            {proposal.summary ? ` · ${proposal.summary}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() =>
                              setExpandedId(expanded ? null : proposal.id)
                            }
                          >
                            {expanded ? "Hide" : "Details"}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => onReviewOne(proposal)}
                          >
                            Review
                          </Button>
                        </div>
                      </div>
                      {expanded ? (
                        <div className="mt-2 rounded-[8px] bg-[var(--ds-background-elevated)] p-1">
                          <ProposalPayloadView proposal={proposal} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Modal>
  );
}
