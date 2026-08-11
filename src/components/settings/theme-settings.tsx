"use client";

import { cn } from "@/lib/cn";
import { platedLogoSrc } from "@/lib/brand";
import { useTheme } from "@/lib/theme-context";
import { themeScheme } from "@/lib/themes/apply";
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
        "group w-full rounded-[12px] bg-[var(--ds-background-elevated)] p-3 text-left transition-shadow ds-focus sm:rounded-[14px] sm:p-4",
        active
          ? "ring-2 ring-[var(--ds-focus-color)]"
          : "ds-border hover:shadow-[var(--ds-shadow-border-medium)]",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3 sm:mb-3">
        <div className="min-w-0">
          <p className="truncate font-heading text-[15px] font-semibold text-[var(--ds-gray-1000)]">
            {theme.name}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-gray-700)]">
            {theme.id.replace("preset:", "THEME_").toUpperCase()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <img
            src={platedLogoSrc(theme.id, themeScheme(tokens))}
            alt=""
            width={28}
            height={28}
            className="size-7 rounded-[7px]"
          />
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
        className="hidden overflow-hidden rounded-[10px] border sm:block"
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

      <div className="mt-2 hidden space-y-1.5 sm:mt-3 sm:block">
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
        <p className="mt-2 truncate text-[11px] leading-4 text-[var(--ds-gray-700)] sm:mt-3 sm:whitespace-normal">
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
    <div className="space-y-3 sm:space-y-4">
      <div>
        <h2 className="font-heading text-sm font-semibold tracking-[-0.02em] sm:text-lg">
          Themes
        </h2>
        <p className="mt-0.5 hidden text-xs leading-5 text-[var(--ds-gray-700)] sm:block">
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
