"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/cn";

type ThemeMenuProps = {
  /** Hide "Create custom theme…" (auth pages). Default true in app. */
  showCreateLink?: boolean;
  /** Icon-only compact control for auth headers. */
  compact?: boolean;
};

export function ThemeMenu({
  showCreateLink = true,
  compact = false,
}: ThemeMenuProps) {
  const { ready, activeTheme, allThemes, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(224, window.innerWidth - 24);
    const panelHeight = panelRef.current?.offsetHeight || 0;
    const preferredLeft = rect.right - width;
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
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
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
  }, [open]);

  const swatch = ready
    ? `linear-gradient(135deg, ${activeTheme.tokens.background100} 0%, ${activeTheme.tokens.focusColor} 100%)`
    : `linear-gradient(135deg, #fafafa 0%, #0072f5 100%)`;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updatePosition();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        title={ready ? activeTheme.name : "Theme"}
        className={cn(
          "inline-flex items-center justify-center rounded-[9px] text-[var(--ds-gray-900)] ds-focus",
          "hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]",
          compact ? "size-8" : "h-8 gap-2 px-2.5 text-[13px]",
        )}
      >
        <span
          className="inline-flex size-3.5 rounded-full"
          style={{ background: swatch }}
          aria-hidden
        />
        {!compact ? (
          <span className="hidden max-w-[7rem] truncate sm:inline">
            {ready ? activeTheme.name : "Theme"}
          </span>
        ) : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              id={listboxId}
              role="listbox"
              style={{ top: position.top, left: position.left }}
              className="fixed z-[110] max-h-[min(18rem,50vh)] w-56 max-w-[calc(100vw-24px)] overflow-y-auto rounded-[12px] bg-[var(--ds-background-elevated)] p-1.5 ds-border-menu ds-strong-border ds-overlay-enter"
            >
              {allThemes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  role="option"
                  aria-selected={theme.id === activeTheme.id}
                  onClick={() => {
                    setTheme(theme.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-left text-[13px] ds-focus",
                    "hover:bg-[var(--ds-background-100)]",
                    theme.id === activeTheme.id &&
                      "bg-[var(--ds-gray-100)] text-[var(--ds-gray-1000)]",
                  )}
                >
                  <span className="flex size-5 shrink-0 overflow-hidden rounded-[4px] ds-border">
                    <span
                      className="flex-1"
                      style={{ background: theme.tokens.background100 }}
                    />
                    <span
                      className="w-1.5"
                      style={{ background: theme.tokens.focusColor }}
                    />
                  </span>
                  <span className="min-w-0 truncate">{theme.name}</span>
                </button>
              ))}
              {showCreateLink ? (
                <div className="mt-1 pt-1 ds-header-rule">
                  <Link
                    href="/settings?section=appearance"
                    onClick={() => setOpen(false)}
                    className="block rounded-[8px] px-2.5 py-1.5 text-[13px] text-[var(--ds-focus-color)] hover:bg-[var(--ds-background-100)]"
                  >
                    Browse all themes…
                  </Link>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
