"use client";

import { useEffect, useRef, useState } from "react";
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const swatch = ready
    ? `linear-gradient(135deg, ${activeTheme.tokens.background100} 0%, ${activeTheme.tokens.focusColor} 100%)`
    : `linear-gradient(135deg, #fafafa 0%, #0072f5 100%)`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={ready ? activeTheme.name : "Theme"}
        className={cn(
          "inline-flex items-center justify-center rounded-[6px] text-[var(--ds-gray-900)] ds-focus",
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

      {open ? (
        <div
          role="listbox"
          className={cn(
            "absolute right-0 z-50 mt-2 max-h-[min(18rem,50vh)] w-56 overflow-y-auto rounded-[8px] bg-[var(--ds-background-elevated)] p-1.5 ds-border-menu ds-overlay-enter",
          )}
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
                "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-left text-[13px] ds-focus",
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
                href="/settings"
                onClick={() => setOpen(false)}
                className="block rounded-[6px] px-2.5 py-1.5 text-[13px] text-[var(--ds-focus-color)] hover:bg-[var(--ds-background-100)]"
              >
                Create custom theme…
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
