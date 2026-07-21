"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { AiActionProposal } from "@/types";

export function ProposalConfirmModal({
  proposal,
  busy,
  onClose,
  onConfirm,
}: {
  proposal: AiActionProposal | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={Boolean(proposal)}
      onClose={onClose}
      title={proposal?.title || "Confirm action"}
      className="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={onConfirm}>
            Confirm &amp; apply
          </Button>
        </>
      }
    >
      {proposal ? (
        <div className="space-y-3 text-sm">
          <p className="text-[var(--ds-gray-900)]">
            {proposal.summary ||
              "Review the exact payload FinOS will apply."}
          </p>
          <p className="text-xs text-[var(--ds-gray-700)]">
            Type: <code>{proposal.action_type}</code>
          </p>
          <pre className="max-h-64 overflow-auto rounded-[8px] bg-[var(--ds-background-100)] p-3 text-[11px] leading-4 text-[var(--ds-gray-900)]">
            {JSON.stringify(proposal.payload, null, 2)}
          </pre>
        </div>
      ) : null}
    </Modal>
  );
}
