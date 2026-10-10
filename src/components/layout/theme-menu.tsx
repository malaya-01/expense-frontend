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
import { useOverlayBack } from "@/lib/native/overlay-back";

type ThemeMenuProps = {
  /** Hide "Create custom theme…" (auth pages). Default true in app. */
  showCreateLink?: boolean;
  /** Icon-only compact control for auth headers. */
  compact?: boolean;
  /**
   * When set, the button hands off instead of opening an anchored menu.
   * The mobile sidebar uses this so the drawer can close first.
   */
  onActivate?: () => void;
};

export function ThemeMenu({
  showCreateLink = true,
  compact = false,
  onActivate,
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
          if (onActivate) {
            onActivate();
            return;
          }
          updatePosition();
          setOpen((v) => !v);
        }}
        aria-expanded={onActivate ? undefined : open}
        aria-haspopup={onActivate ? "dialog" : "listbox"}
        aria-controls={onActivate ? undefined : listboxId}
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

      {open && !onActivate && typeof document !== "undefined"
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
                    className="link-accent block rounded-[8px] px-2.5 py-1.5 text-[13px] hover:bg-[var(--ds-background-100)]"
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

/**
 * Theme picker shown after the mobile sidebar closes. It lives outside the
 * drawer so the drawer can unmount without taking the picker with it.
 */
export function ThemeMenuSheet({
  open,
  onClose,
  showCreateLink = true,
}: {
  open: boolean;
  onClose: () => void;
  showCreateLink?: boolean;
}) {
  const { activeTheme, allThemes, setTheme } = useTheme();
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useOverlayBack(open, () => onCloseRef.current());

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[115]">
      <button
        type="button"
        aria-label="Close theme"
        onClick={() => onCloseRef.current()}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] ds-backdrop-enter"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 flex max-h-[min(70dvh,32rem)] flex-col rounded-t-[16px] bg-[var(--ds-background-elevated)] ds-overlay-enter"
      >
        <header className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
          <h2 id={titleId} className="text-[15px] font-semibold">
            Theme
          </h2>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            className="rounded-[8px] px-2 py-1 text-[13px] text-[var(--ds-gray-900)] ds-focus"
          >
            Done
          </button>
        </header>
        <div
          role="listbox"
          aria-label="Theme"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          {allThemes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              role="option"
              aria-selected={theme.id === activeTheme.id}
              onClick={() => {
                setTheme(theme.id);
                onCloseRef.current();
              }}
              className={cn(
                "flex min-h-11 w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[14px] ds-focus",
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
                onClick={() => onCloseRef.current()}
                className="link-accent block rounded-[8px] px-2.5 py-2.5 text-[14px] hover:bg-[var(--ds-background-100)]"
              >
                Browse all themes…
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  );
}
