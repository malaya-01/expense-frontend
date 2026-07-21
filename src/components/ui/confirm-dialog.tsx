"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { Modal } from "./modal";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  busy = false,
  destructive = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      className="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            loading={busy}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {destructive ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-[var(--ds-danger-hover)] text-[var(--ds-status-red)]">
            <AlertTriangle size={17} />
          </span>
        ) : null}
        <p className="pt-1 text-sm leading-5 text-[var(--ds-gray-900)]">
          {description || "This action cannot be undone."}
        </p>
      </div>
    </Modal>
  );
}
