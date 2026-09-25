"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOverlayBack } from "@/lib/native/overlay-back";

const EXIT_MS = 280;

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  bodyClassName,
  flushBody = false,
  wide = false,
  style,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  flushBody?: boolean;
  wide?: boolean;
  style?: CSSProperties;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useOverlayBack(open, () => onCloseRef.current());

  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setVisible(true);
      return;
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new Event("finos:close-overlays"));
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      const alreadyInside = dialogRef.current?.contains(document.activeElement);
      if (alreadyInside) return;
      const firstBodyControl = dialogRef.current?.querySelector<HTMLElement>(
        "[data-modal-body] input:not([disabled]), [data-modal-body] select:not([disabled]), [data-modal-body] textarea:not([disabled]), [data-modal-body] button:not([disabled])",
      );
      (firstBodyControl || closeRef.current)?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.querySelector("[data-nested-overlay]")) {
          return;
        }
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) || [],
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-5 lg:p-8">
      <button
        type="button"
        aria-label="Close dialog"
        className={cn(
          "absolute inset-0 bg-black/65 backdrop-blur-[2px]",
          visible ? "ds-backdrop-enter" : "ds-backdrop-exit",
        )}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[20px] bg-[var(--ds-background-elevated)] ds-border-modal ds-strong-border sm:rounded-[24px]",
          wide
            ? "modal-wide"
            : "sm:max-h-[min(92dvh,920px)] sm:w-[calc(100%-2.5rem)]",
          !wide && !/\bmax-w-/.test(className ?? "") && "max-w-xl",
          visible ? "ds-sheet-enter" : "ds-sheet-exit",
          className,
        )}
        style={style}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--ds-gray-200)] sm:hidden" aria-hidden />
        <div className="flex shrink-0 items-center justify-between border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_10%,transparent)] px-5 py-3.5 sm:px-8 sm:py-5">
          <h2
            id={titleId}
            className="text-[15px] font-semibold text-[var(--ds-gray-1000)] sm:text-base"
          >
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex size-8 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
          >
            <X size={17} />
          </button>
        </div>
        <div
          data-modal-body
          className={cn(
            "app-scrollbar min-h-0 flex-1",
            flushBody
              ? "overflow-hidden p-0"
              : "overflow-y-auto px-5 py-5 pb-6 sm:px-8 sm:py-7",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_10%,transparent)] bg-[var(--ds-background-elevated)] px-5 py-3.5 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:gap-2.5 sm:px-8 sm:py-5 sm:pb-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
