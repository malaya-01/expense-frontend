"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

type OptionEl = ReactElement<{
  value?: string | number;
  disabled?: boolean;
  children?: ReactNode;
}>;

function optionLabel(option: OptionEl): string {
  const kids = option.props.children;
  if (typeof kids === "string" || typeof kids === "number") return String(kids);
  return String(option.props.value ?? "");
}

function optionValue(option: OptionEl): string {
  return String(option.props.value ?? "");
}

function sortOptions(options: OptionEl[]): OptionEl[] {
  return [...options].sort((a, b) =>
    optionLabel(a).localeCompare(optionLabel(b), undefined, {
      sensitivity: "base",
      numeric: true,
    }),
  );
}

export function Select({
  className,
  children,
  value,
  defaultValue,
  disabled,
  id,
  name,
  required,
  onChange,
  "aria-label": ariaLabel,
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const { placeholders, choices } = useMemo(() => {
    const all = Children.toArray(children).filter(isValidElement) as OptionEl[];
    const placeholders: OptionEl[] = [];
    const rest: OptionEl[] = [];
    for (const option of all) {
      const val = optionValue(option);
      if (option.props.disabled || val === "") placeholders.push(option);
      else rest.push(option);
    }
    return { placeholders, choices: sortOptions(rest) };
  }, [children]);

  const options = [...placeholders, ...choices];
  const current = String(value ?? defaultValue ?? "");
  const selected =
    options.find((option) => optionValue(option) === current) || options[0];
  const label = selected ? optionLabel(selected) : "Select";

  function place() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewport = window.visualViewport;
    const viewH = viewport?.height ?? window.innerHeight;
    const viewW = viewport?.width ?? window.innerWidth;
    const offsetTop = viewport?.offsetTop ?? 0;
    const offsetLeft = viewport?.offsetLeft ?? 0;
    const width = Math.min(Math.max(rect.width, 180), viewW - 24);
    const panelH = Math.min(
      panelRef.current?.offsetHeight || 0,
      Math.min(320, viewH - 24),
    );
    const gap = 6;
    const below = rect.bottom + gap;
    const fitsBelow = !panelH || below + panelH <= viewH - 12;
    const above = rect.top - (panelH || 0) - gap;
    const top = fitsBelow ? below : Math.max(12, above);
    setPos({
      top: top + offsetTop,
      left:
        Math.max(12, Math.min(rect.left, viewW - width - 12)) + offsetLeft,
      width,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const frame = window.requestAnimationFrame(place);
    return () => window.cancelAnimationFrame(frame);
  }, [open, choices.length]);

  useEffect(() => {
    if (!open) return;
    const onWin = () => place();
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", onWin);
    window.visualViewport?.addEventListener("resize", onWin);
    window.visualViewport?.addEventListener("scroll", onWin);
    window.addEventListener("scroll", onWin, true);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onWin);
      window.visualViewport?.removeEventListener("resize", onWin);
      window.visualViewport?.removeEventListener("scroll", onWin);
      window.removeEventListener("scroll", onWin, true);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: string) {
    setOpen(false);
    if (!onChange || next === current) return;
    const event = {
      target: { value: next, name: name || "", id: id || "" },
      currentTarget: { value: next, name: name || "", id: id || "" },
    } as unknown as React.ChangeEvent<HTMLSelectElement>;
    onChange(event);
  }

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-required={required}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl bg-[var(--ds-background-100)] px-3 text-left text-[13px] text-[var(--ds-gray-1000)] sm:h-11 sm:px-3.5",
          "border border-[color:color-mix(in_srgb,var(--ds-gray-1000)_10%,transparent)]",
          "outline-none transition-colors hover:border-[color:color-mix(in_srgb,var(--ds-gray-1000)_18%,transparent)]",
          "focus-visible:border-[var(--ds-focus-input)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ds-focus-input)]",
          disabled && "pointer-events-none opacity-45",
          !current && "text-[var(--ds-gray-700)]",
          className,
        )}
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDown
          size={15}
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
              id={listId}
              role="listbox"
              style={{
                top: pos.top,
                left: pos.left,
                width: pos.width,
                visibility: pos.width ? "visible" : "hidden",
              }}
              className="fixed z-[220] max-h-80 overflow-y-auto rounded-xl border border-[color:color-mix(in_srgb,var(--ds-gray-1000)_10%,transparent)] bg-[var(--ds-background-elevated)] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.16)]"
            >
              {options.map((option) => {
                const val = optionValue(option);
                const active = val === current;
                const isDisabled = Boolean(option.props.disabled);
                return (
                  <button
                    key={`${val}-${optionLabel(option)}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={isDisabled}
                    onClick={() => pick(val)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-[13px]",
                      isDisabled
                        ? "cursor-default text-[var(--ds-gray-700)]"
                        : "text-[var(--ds-gray-1000)] hover:bg-[var(--ds-gray-100)]",
                      active && !isDisabled && "bg-[var(--ds-gray-100)]",
                    )}
                  >
                    <span className="min-w-0 truncate">{optionLabel(option)}</span>
                    {active && !isDisabled ? (
                      <Check size={14} className="shrink-0 opacity-70" />
                    ) : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
