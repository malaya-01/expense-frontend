"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useOverlayBack } from "@/lib/native/overlay-back";

/* ------------------------------------------------------------------------ */
/* Unsaved-changes registry                                                  */
/* ------------------------------------------------------------------------ */

type DirtyContextValue = {
  setDirty: (key: string, dirty: boolean) => void;
};

export const SettingsDirtyContext = createContext<DirtyContextValue | null>(
  null,
);

/** Report a section's unsaved state to the settings shell (nav guard). */
export function useReportDirty(key: string, dirty: boolean) {
  const ctx = useContext(SettingsDirtyContext);
  useEffect(() => {
    ctx?.setDirty(key, dirty);
    return () => ctx?.setDirty(key, false);
  }, [ctx, key, dirty]);
}

/* ------------------------------------------------------------------------ */
/* Layout                                                                    */
/* ------------------------------------------------------------------------ */

/** A titled card holding related settings rows. */
export function SettingsGroup({
  title,
  description,
  actions,
  children,
  tone = "default",
  className,
  bodyClassName,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  tone?: "default" | "danger";
  className?: string;
  bodyClassName?: string;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "min-w-0 rounded-[12px] bg-[var(--ds-background-elevated)] sm:rounded-[14px]",
        tone === "danger"
          ? "border border-[color:color-mix(in_srgb,var(--ds-status-red)_35%,transparent)]"
          : "ds-border",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-1 sm:px-5 sm:pt-5">
        <div className="min-w-0 flex-1">
          <h3
            id={titleId}
            className={cn(
              "font-heading text-[15px] font-semibold tracking-[-0.01em]",
              tone === "danger"
                ? "text-[var(--ds-status-red)]"
                : "text-[var(--ds-gray-1000)]",
            )}
          >
            {title}
          </h3>
          {description ? (
            <p className="mt-1 max-w-2xl text-[12.5px] leading-5 text-[var(--ds-gray-700)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </header>
      <div
        className={cn(
          "px-4 pb-2 sm:px-5 [&>*+*]:border-t [&>*+*]:border-[color:color-mix(in_srgb,var(--ds-gray-1000)_7%,transparent)]",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * One setting: label + helper text, control on the right (stacked on
 * phones). `htmlFor` ties the visible label to the control.
 */
export function SettingRow({
  label,
  description,
  htmlFor,
  labelId,
  children,
  stacked = false,
  className,
}: {
  label: string;
  description?: ReactNode;
  htmlFor?: string;
  labelId?: string;
  children: ReactNode;
  stacked?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2.5 py-3.5",
        !stacked &&
          "sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] sm:items-center sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        {htmlFor ? (
          <label
            id={labelId}
            htmlFor={htmlFor}
            className="block text-[13px] font-medium leading-5 text-[var(--ds-gray-1000)]"
          >
            {label}
          </label>
        ) : (
          <p
            id={labelId}
            className="text-[13px] font-medium leading-5 text-[var(--ds-gray-1000)]"
          >
            {label}
          </p>
        )}
        {description ? (
          <p className="mt-0.5 text-[12px] leading-[1.45] text-[var(--ds-gray-700)]">
            {description}
          </p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A setting whose control is a switch: the whole row is the hit target. */
export function SwitchRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const descId = `${id}-desc`;
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <label
          htmlFor={id}
          className="block cursor-pointer text-[13px] font-medium leading-5 text-[var(--ds-gray-1000)]"
        >
          {label}
        </label>
        {description ? (
          <p
            id={descId}
            className="mt-0.5 text-[12px] leading-[1.45] text-[var(--ds-gray-700)]"
          >
            {description}
          </p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        describedBy={description ? descId : undefined}
      />
    </div>
  );
}

export function Switch({
  id,
  checked,
  onChange,
  disabled,
  describedBy,
  label,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  describedBy?: string;
  /** Accessible name when there is no <label htmlFor>. */
  label?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        // 44px hit area around a 24px track.
        "relative inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full ds-focus disabled:opacity-45",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative inline-block h-6 w-11 rounded-full transition-colors duration-150",
          checked
            ? "bg-[var(--ds-focus-color)]"
            : "bg-[color-mix(in_srgb,var(--ds-gray-1000)_18%,transparent)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform duration-150",
            checked && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}

/** Small set of mutually exclusive choices (radiogroup). */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabelledBy,
  ariaLabel,
  disabled,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: string; hint?: string }>;
  onChange: (value: T) => void;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function move(index: number, delta: number) {
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }
  return (
    <div
      role="radiogroup"
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabel}
      className={cn(
        "flex w-full min-w-0 gap-1 rounded-[10px] bg-[var(--ds-background-200)] p-1",
        className,
      )}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            title={option.hint}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(index, -1);
              }
            }}
            className={cn(
              "min-h-10 min-w-0 flex-1 truncate rounded-[7px] px-2.5 text-[12.5px] font-medium transition-colors ds-focus disabled:opacity-45",
              active
                ? "bg-[var(--ds-background-elevated)] text-[var(--ds-gray-1000)] shadow-[var(--ds-shadow-border)]"
                : "text-[var(--ds-gray-900)] hover:text-[var(--ds-gray-1000)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Bar shown while a section has unsaved edits. Fixed to the viewport (via a
 * portal, so no scroll container or card can clip it): above the phone tab
 * bar, centred under the content column on desktop, and above the on-screen
 * keyboard while typing (see globals.css [data-save-bar]).
 */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  disabled,
  message = "Unsaved changes",
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  disabled?: boolean;
  message?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!dirty && !saving) return null;
  return (
    <>
      {/* Keeps the last settings scrollable above the fixed bar. */}
      <div aria-hidden className="h-20 md:h-16" />
      {mounted
        ? createPortal(
            <div
              role="region"
              aria-label="Unsaved changes"
              data-save-bar
              className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[45] px-3 md:bottom-5 md:left-[var(--app-sidebar-offset)] md:px-8"
            >
              <div className="pointer-events-auto mx-auto flex max-w-[40rem] items-center gap-2 rounded-[14px] bg-[var(--ds-background-elevated)] py-2 pl-3.5 pr-2 shadow-[var(--ds-shadow-menu)] ds-border">
                <p
                  className="flex min-w-0 flex-1 items-center gap-2 text-[12.5px] font-medium text-[var(--ds-gray-900)]"
                  aria-live="polite"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full bg-[var(--ds-status-orange)]"
                  />
                  <span className="truncate">{message}</span>
                </p>
                <Button
                  variant="ghost"
                  size="md"
                  className="h-9 shrink-0 px-3"
                  onClick={onDiscard}
                  disabled={saving}
                >
                  Discard
                </Button>
                <Button
                  size="md"
                  className="h-9 shrink-0 px-3.5"
                  loading={saving}
                  disabled={disabled}
                  onClick={onSave}
                >
                  Save
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Searchable select (combobox)                                              */
/* ------------------------------------------------------------------------ */

export type SearchOption = {
  value: string;
  label: string;
  /** Secondary text (e.g. UTC offset, currency name). */
  hint?: string;
  /** Extra text matched by search but not shown. */
  keywords?: string;
};

export function SearchSelect({
  id,
  value,
  options,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  disabled,
  ariaLabelledBy,
  emptyLabel = "No matches",
}: {
  id?: string;
  value: string;
  options: SearchOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  ariaLabelledBy?: string;
  emptyLabel?: string;
}) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 320 });

  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) =>
      `${option.label} ${option.hint ?? ""} ${option.keywords ?? ""} ${option.value}`
        .toLowerCase()
        .includes(q),
    );
  }, [options, query]);

  function place() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewport = window.visualViewport;
    const viewH = viewport?.height ?? window.innerHeight;
    const viewW = viewport?.width ?? window.innerWidth;
    const width = Math.min(Math.max(rect.width, 260), viewW - 24);
    const below = viewH - rect.bottom - 16;
    const above = rect.top - 16;
    const openUp = below < 260 && above > below;
    const maxHeight = Math.max(200, Math.min(380, openUp ? above : below));
    setPos({
      top: openUp ? Math.max(12, rect.top - maxHeight - 6) : rect.bottom + 6,
      left: Math.max(12, Math.min(rect.left, viewW - width - 12)),
      width,
      maxHeight,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const index = Math.max(
      0,
      filtered.findIndex((option) => option.value === value),
    );
    setActive(index);
    const frame = requestAnimationFrame(() => {
      searchRef.current?.focus();
      listRef.current
        ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
        ?.scrollIntoView({ block: "nearest" });
    });
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onResize = () => place();
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useOverlayBack(open, () => setOpen(false));

  function close(focusTrigger = true) {
    setOpen(false);
    setQuery("");
    if (focusTrigger) triggerRef.current?.focus();
  }

  function pick(next: string) {
    close();
    if (next !== value) onChange(next);
  }

  function onSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(filtered.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[active];
      if (option) pick(option.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      close(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  return (
    <div className="relative w-full min-w-0">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={ariaLabelledBy}
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(
          "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-[9px] bg-[var(--ds-background-elevated)] px-3 text-left text-[13px] text-[var(--ds-gray-1000)] ds-border outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ds-focus-input)] disabled:pointer-events-none disabled:opacity-45",
        )}
      >
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="min-w-0 truncate">
            {selected ? selected.label : placeholder}
          </span>
          {selected?.hint ? (
            <span className="shrink-0 truncate text-[11.5px] text-[var(--ds-gray-700)]">
              {selected.hint}
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={15}
          aria-hidden
          className={cn(
            "shrink-0 text-[var(--ds-gray-700)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              data-nested-overlay
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              className="fixed z-[220] flex flex-col overflow-hidden rounded-xl border border-[color:color-mix(in_srgb,var(--ds-gray-1000)_10%,transparent)] bg-[var(--ds-background-elevated)] shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
            >
              <div className="relative border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] p-2">
                <Search
                  size={14}
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-4.5 -translate-y-1/2 text-[var(--ds-gray-700)]"
                />
                <input
                  ref={searchRef}
                  type="search"
                  role="combobox"
                  aria-expanded
                  aria-controls={listId}
                  aria-activedescendant={
                    filtered[active] ? `${listId}-${active}` : undefined
                  }
                  aria-autocomplete="list"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onSearchKey}
                  placeholder={searchPlaceholder}
                  className="h-10 w-full rounded-[8px] bg-[var(--ds-background-100)] pr-3 pl-8 text-base text-[var(--ds-gray-1000)] outline-none placeholder:text-[var(--ds-gray-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ds-focus-input)] sm:text-[13px]"
                />
              </div>
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                style={{ maxHeight: pos.maxHeight - 60 }}
                className="overflow-y-auto overscroll-contain py-1"
              >
                {filtered.length === 0 ? (
                  <li className="px-3 py-3 text-[12.5px] text-[var(--ds-gray-700)]">
                    {emptyLabel}
                  </li>
                ) : (
                  filtered.map((option, index) => {
                    const isSelected = option.value === value;
                    return (
                      <li
                        key={option.value}
                        id={`${listId}-${index}`}
                        data-index={index}
                        role="option"
                        aria-selected={isSelected}
                        onPointerMove={() => setActive(index)}
                        onClick={() => pick(option.value)}
                        className={cn(
                          "flex min-h-10 cursor-pointer items-center justify-between gap-3 px-3 py-2 text-[13px] text-[var(--ds-gray-1000)]",
                          index === active && "bg-[var(--ds-gray-100)]",
                        )}
                      >
                        <span className="min-w-0 truncate">{option.label}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          {option.hint ? (
                            <span className="text-[11.5px] text-[var(--ds-gray-700)] tabular-nums">
                              {option.hint}
                            </span>
                          ) : null}
                          {isSelected ? (
                            <Check size={14} aria-hidden className="opacity-70" />
                          ) : null}
                        </span>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Misc                                                                      */
/* ------------------------------------------------------------------------ */

export function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 py-2.5">
      <span className="shrink-0 text-[13px] text-[var(--ds-gray-900)]">
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 truncate text-right",
          mono
            ? "font-mono text-[12px] text-[var(--ds-gray-900)]"
            : "text-[13px] text-[var(--ds-gray-1000)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function SectionLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3 py-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <span className="block h-4 w-40 animate-pulse rounded-[6px] bg-[var(--ds-gray-100)]" />
          <span className="block h-10 w-48 animate-pulse rounded-[9px] bg-[var(--ds-gray-100)]" />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
