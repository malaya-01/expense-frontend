"use client";

import { cn } from "@/lib/cn";
import { useTheme } from "@/lib/theme-context";
import type { ThemeDefinition } from "@/lib/themes/types";

function ThemePreviewCard({
  theme,
  active,
  onSelect,
}: {
  theme: ThemeDefinition;
  active: boolean;
  onSelect: () => void;
}) {
  const { tokens } = theme;
  const accent = tokens.focusColor;
  const muted = tokens.gray900;
  const surface = tokens.backgroundElevated;
  const canvas = tokens.background100;
  const ink = tokens.gray1000;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full rounded-[14px] bg-[var(--ds-background-elevated)] p-4 text-left transition-shadow ds-focus",
        active
          ? "ring-2 ring-[var(--ds-focus-color)] ring-offset-2 ring-offset-[var(--ds-background-100)]"
          : "ds-border hover:shadow-[var(--ds-shadow-border-medium)]",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-heading text-[15px] font-semibold text-[var(--ds-gray-1000)]">
            {theme.name}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-gray-700)]">
            {theme.id.replace("preset:", "THEME_").toUpperCase()}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5 pt-1">
          <span
            className="size-2.5 rounded-full"
            style={{ background: accent }}
            aria-hidden
          />
          <span
            className="size-2.5 rounded-full"
            style={{ background: muted }}
            aria-hidden
          />
        </div>
      </div>

      <div
        className="overflow-hidden rounded-[10px] border"
        style={{ borderColor: `${ink}14`, background: canvas }}
      >
        <div
          className="flex items-center gap-2 px-2.5 py-1.5"
          style={{ background: accent }}
        >
          <span className="size-1.5 rounded-full bg-white/80" />
          <span className="text-[9px] font-semibold text-white">{theme.name}</span>
          <span className="ml-auto rounded-full bg-white/20 px-1.5 py-0.5 text-[8px] text-white">
            Ledger
          </span>
        </div>
        <div className="grid grid-cols-[56px_1fr] gap-0">
          <div className="space-y-1.5 border-r px-2 py-2" style={{ borderColor: `${ink}10` }}>
            {["Overview", "Cash", "Spend"].map((item) => (
              <div
                key={item}
                className="truncate text-[8px]"
                style={{ color: muted }}
              >
                {item}
              </div>
            ))}
          </div>
          <div className="space-y-2 p-2" style={{ background: surface }}>
            <div className="text-[9px] font-medium" style={{ color: ink }}>
              Net worth · 128
            </div>
            <div className="flex gap-1.5">
              <span
                className="rounded-[5px] px-1.5 py-0.5 text-[8px] font-semibold text-white"
                style={{ background: accent }}
              >
                Add
              </span>
              <span
                className="rounded-[5px] px-1.5 py-0.5 text-[8px]"
                style={{ background: `${ink}10`, color: muted }}
              >
                Filter
              </span>
            </div>
            <div
              className="inline-flex rounded-full px-1.5 py-0.5 text-[8px]"
              style={{ background: `${accent}18`, color: accent }}
            >
              Pending
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] text-[var(--ds-gray-900)]">
          <span
            className="size-3.5 rounded-[4px]"
            style={{ background: accent }}
          />
          <span className="w-14 text-[var(--ds-gray-700)]">Primary</span>
          <span className="font-mono text-[10px] tabular-nums">{accent}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--ds-gray-900)]">
          <span
            className="size-3.5 rounded-[4px]"
            style={{ background: muted }}
          />
          <span className="w-14 text-[var(--ds-gray-700)]">Muted</span>
          <span className="font-mono text-[10px] tabular-nums">{muted}</span>
        </div>
      </div>

      {theme.description ? (
        <p className="mt-3 text-[11px] leading-4 text-[var(--ds-gray-700)]">
          {theme.description}
        </p>
      ) : null}
    </button>
  );
}

/** Inline theme gallery — no custom theme editor, no modal browser. */
export function AppearanceSection() {
  const { activeThemeId, presetThemes, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-[-0.02em]">
          Themes
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--ds-gray-700)]">
          Pick a workspace palette. Changes apply instantly across FinOS.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {presetThemes.map((theme) => (
          <ThemePreviewCard
            key={theme.id}
            theme={theme}
            active={theme.id === activeThemeId}
            onSelect={() => setTheme(theme.id)}
          />
        ))}
      </div>
    </div>
  );
}

/** @deprecated use AppearanceSection */
export const ThemeSettings = AppearanceSection;
