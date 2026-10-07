"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProposalPayloadView } from "@/components/ai/proposal-payload-view";
import { useModulePermissions } from "@/components/permissions/permission-gate";
import { proposalDecisionEndpoint } from "@/lib/ai/proposal-bulk-progress";
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
  const perms = useModulePermissions("ai");
  const endpoint = proposal
    ? proposalDecisionEndpoint(proposal.id, "confirm")
    : "";

  return (
    <Modal
      open={Boolean(proposal)}
      onClose={() => {
        if (busy) return;
        onClose();
      }}
      title={proposal?.title || "Confirm action"}
      className="max-w-xl"
      footer={
        <>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={!perms.create}
            onClick={onConfirm}
          >
            Confirm &amp; apply
          </Button>
        </>
      }
    >
      {proposal ? (
        <div className="space-y-3">
          {busy ? (
            <div className="rounded-[10px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] p-3">
              <p className="font-mono text-[10px] text-[var(--ds-gray-700)]">
                {endpoint}
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--ds-gray-200)]">
                <span className="api-loader-track block h-full">
                  <span className="api-loader-bar block h-full w-1/3 rounded-full bg-[var(--ds-focus-color)]" />
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-[var(--ds-gray-700)]">
                Calling the API to apply this action…
              </p>
            </div>
          ) : null}
          <ProposalPayloadView proposal={proposal} />
        </div>
      ) : null}
    </Modal>
  );
}
