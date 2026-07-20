"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[var(--ds-background-200)]/80"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="modal-title"
        className={cn(
          "relative z-10 w-full max-w-md rounded-[12px] bg-[var(--ds-background-elevated)] ds-border-modal ds-overlay-enter",
          className,
        )}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 id="modal-title" className="text-[var(--ds-gray-1000)]">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>
        <div className="px-6 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 px-6 pb-5 pt-1">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
