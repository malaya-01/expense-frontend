"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProposalPayloadView } from "@/components/ai/proposal-payload-view";
import { useModulePermissions } from "@/components/permissions/permission-gate";
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
      {proposal ? <ProposalPayloadView proposal={proposal} /> : null}
    </Modal>
  );
}
