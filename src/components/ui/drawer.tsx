"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const EXIT_MS = 280;

export function Drawer({
  open,
  title,
  children,
  side = "right",
  onClose,
  className,
  contentClassName,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
  onClose: () => void;
  className?: string;
  contentClassName?: string;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });
      return () => window.cancelAnimationFrame(id);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const focusable = Array.from(
          drawerRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) || [],
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/55 backdrop-blur-[2px]",
          visible ? "ds-backdrop-enter" : "ds-backdrop-exit",
        )}
      />
      <section
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "absolute inset-y-0 flex w-[min(88vw,360px)] flex-col bg-[var(--ds-background-elevated)] shadow-2xl",
          side === "left"
            ? cn(
                "left-0 border-r border-[var(--ds-gray-200)]",
                visible ? "ds-drawer-enter-left" : "ds-drawer-exit-left",
              )
            : cn(
                "right-0 border-l border-[var(--ds-gray-200)]",
                visible ? "ds-drawer-enter-right" : "ds-drawer-exit-right",
              ),
          className,
        )}
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--ds-gray-200)] px-5">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="flex size-9 items-center justify-center rounded-[9px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
          >
            <X size={18} />
          </button>
        </header>
        <div
          className={cn("min-h-0 flex-1 overflow-y-auto p-4", contentClassName)}
        >
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
}
