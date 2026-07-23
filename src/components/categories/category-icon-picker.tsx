"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Tags } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  CATEGORY_ICON_COMPONENTS,
  CATEGORY_ICON_IDS,
  CATEGORY_ICON_LABELS,
  getCategoryIconComponent,
  type CategoryIconId,
} from "@/lib/categories/icons";

export function CategoryIconPickerPanel({
  value,
  color,
  onChange,
  autoFocusSearch = false,
}: {
  value: CategoryIconId;
  color?: string;
  onChange: (icon: CategoryIconId) => void;
  autoFocusSearch?: boolean;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const accent = color || "var(--ds-focus-color)";

  useEffect(() => {
    if (!autoFocusSearch) return;
    const timer = window.setTimeout(() => {
      searchRef.current?.focus({ preventScroll: true });
      searchRef.current?.select();
    }, 10);
    return () => window.clearTimeout(timer);
  }, [autoFocusSearch]);

  const icons = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORY_ICON_IDS;
    return CATEGORY_ICON_IDS.filter(
      (id) =>
        id.includes(q) ||
        CATEGORY_ICON_LABELS[id].toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="space-y-2 p-1">
      <p className="px-1 text-[11px] text-[var(--ds-gray-700)]">
        Choose an icon for this category
      </p>

      <div className="relative">
        <Search
          size={14}
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-[var(--ds-gray-700)]"
        />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            // Keep modal Escape/Tab handlers from fighting the field.
            event.stopPropagation();
          }}
          placeholder="Search icons…"
          aria-label="Search icons"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={cn(
            "h-9 w-full rounded-[8px] bg-[var(--ds-background-100)] py-2 pl-8 pr-2.5 text-xs text-[var(--ds-gray-1000)]",
            "outline-none placeholder:text-[var(--ds-gray-700)]",
            "focus:outline focus:outline-2 focus:outline-[var(--ds-focus-input)]",
          )}
        />
      </div>

      <div className="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto sm:grid-cols-7">
        {icons.map((id) => {
          const Icon = CATEGORY_ICON_COMPONENTS[id];
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              title={CATEGORY_ICON_LABELS[id]}
              aria-label={CATEGORY_ICON_LABELS[id]}
              aria-pressed={selected}
              onClick={() => onChange(id)}
              className={cn(
                "flex size-8 items-center justify-center rounded-[8px] transition-colors ds-focus",
                selected
                  ? "ring-2 ring-[var(--ds-focus-color)]"
                  : "hover:bg-[var(--ds-gray-100)]",
              )}
              style={
                selected
                  ? {
                      color: accent,
                      background: `color-mix(in srgb, ${accent} 16%, transparent)`,
                    }
                  : { color: "var(--ds-gray-900)" }
              }
            >
              <Icon size={15} strokeWidth={1.85} />
            </button>
          );
        })}
      </div>
      {icons.length === 0 ? (
        <p className="px-1 text-xs text-[var(--ds-gray-700)]">No icons match.</p>
      ) : null}
    </div>
  );
}

/** Name input with trailing icon (updates while typing; click to change). */
export function CategoryNameWithIcon({
  id,
  name,
  icon,
  color,
  required,
  showIcon = true,
  onNameChange,
  onNameBlur,
  onIconChange,
}: {
  id?: string;
  name: string;
  icon: CategoryIconId;
  color?: string;
  required?: boolean;
  showIcon?: boolean;
  onNameChange: (name: string) => void;
  onNameBlur?: () => void;
  onIconChange: (icon: CategoryIconId) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const accent = color || "var(--ds-focus-color)";
  const Icon = getCategoryIconComponent(icon) || Tags;

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setPickerOpen(false);
      }
    };
    // bubble phase so the search input can stopPropagation first if needed
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  useEffect(() => {
    if (!showIcon) setPickerOpen(false);
  }, [showIcon]);

  return (
    <div ref={rootRef} className="space-y-2">
      <div className="relative">
        <input
          id={id}
          required={required}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          onBlur={onNameBlur}
          placeholder="e.g. Groceries"
          className={cn(
            "h-11 w-full rounded-[9px] bg-[var(--ds-background-elevated)] py-2 pl-3.5 text-[13px] text-[var(--ds-gray-1000)]",
            "ds-border outline-none",
            "transition-[box-shadow,background-color] focus:shadow-none focus:outline focus:outline-2 focus:outline-[var(--ds-focus-input)]",
            showIcon ? "pr-12" : "pr-3.5",
          )}
        />
        {showIcon ? (
          <div className="absolute inset-y-0 right-1.5 flex items-center">
            <button
              type="button"
              aria-label={pickerOpen ? "Close icon picker" : "Change category icon"}
              aria-expanded={pickerOpen}
              title="Change icon"
              onClick={() => setPickerOpen((open) => !open)}
              className="inline-flex size-8 items-center justify-center rounded-[8px] transition-colors hover:bg-[var(--ds-gray-100)] ds-focus"
              style={{
                color: accent,
                background: `color-mix(in srgb, ${accent} 12%, transparent)`,
              }}
            >
              <Icon size={16} strokeWidth={1.85} />
            </button>
          </div>
        ) : null}
      </div>

      {showIcon && pickerOpen ? (
        <div
          data-nested-overlay
          className="rounded-[14px] bg-[var(--ds-background-elevated)] p-2 ds-border-menu ds-strong-border"
        >
          <CategoryIconPickerPanel
            value={icon}
            color={color}
            autoFocusSearch
            onChange={(next) => {
              onIconChange(next);
              setPickerOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
