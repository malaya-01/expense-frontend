"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export function Popover({
  trigger,
  children,
  align = "end",
  className,
  onOpenChange,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(320, window.innerWidth - 24);
    const panelHeight = panelRef.current?.offsetHeight || 0;
    const preferredLeft = align === "end" ? rect.right - width : rect.left;
    const below = rect.bottom + 8;
    const top =
      panelHeight && below + panelHeight > window.innerHeight - 12
        ? Math.max(12, rect.top - panelHeight - 8)
        : below;
    setPosition({
      top,
      left: Math.max(12, Math.min(preferredLeft, window.innerWidth - width - 12)),
    });
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
    // Position once after the portal panel has measurable dimensions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, onOpenChange]);

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center justify-center rounded-[6px] ds-focus"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          updatePosition();
          setOpen((current) => {
            const next = !current;
            onOpenChange?.(next);
            return next;
          });
        }}
      >
        {trigger}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          style={{ top: position.top, left: position.left }}
          className={cn(
            "fixed z-[110] w-[320px] max-w-[calc(100vw-24px)] rounded-[14px] bg-[var(--ds-background-elevated)] p-4 ds-border-menu ds-strong-border ds-overlay-enter",
            className,
          )}
        >
          {children}
        </div>,
        document.body,
      )
        : null}
    </div>
  );
}

export function InfoTip({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Popover
      trigger={
        <span
          className="inline-flex size-5 items-center justify-center rounded-full bg-[var(--ds-gray-100)] text-[11px] font-medium text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-200)]"
          aria-label={`Help: ${title}`}
          title={title}
        >
          i
        </span>
      }
    >
      <p className="text-sm font-medium text-[var(--ds-gray-1000)]">{title}</p>
      <div className="mt-2 space-y-2 text-xs leading-4 text-[var(--ds-gray-900)]">
        {children}
      </div>
    </Popover>
  );
}
