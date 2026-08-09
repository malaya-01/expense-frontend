"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProposalPayloadView } from "@/components/ai/proposal-payload-view";
import { useModulePermissions } from "@/components/permissions/permission-gate";
import { cn } from "@/lib/cn";
import type { AiActionProposal } from "@/types";

export function ProposalBatchReviewModal({
  open,
  proposals,
  busy,
  onClose,
  onDecide,
  onReviewOne,
}: {
  open: boolean;
  proposals: AiActionProposal[];
  busy: boolean;
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

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(pending.map((p) => p.id)));
    setExpandedId(null);
  }, [open, pending]);

  const allIds = pending.map((p) => p.id);
  const selectedIds = allIds.filter((id) => selected.has(id));
  const unselectedIds = allIds.filter((id) => !selected.has(id));
  const allSelected =
    pending.length > 0 && selectedIds.length === pending.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Review ${pending.length} pending action${pending.length === 1 ? "" : "s"}`}
      className="max-w-2xl"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
          <div className="flex flex-wrap gap-1.5">
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
            <Button size="sm" variant="ghost" disabled={busy} onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      {!pending.length ? (
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
