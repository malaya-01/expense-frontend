"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import {
  FONT_OPTIONS,
  FONT_PAIRINGS,
  describeFonts,
  fontStack,
  pairingIdFor,
  resolveThemeFonts,
} from "@/lib/themes/fonts";
import type { ThemeDefinition } from "@/lib/themes/types";
import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  type UserPreferences,
} from "@/lib/preferences/types";
import { usePreferences } from "@/lib/preferences/use-preferences";
import {
  SearchSelect,
  Segmented,
  SettingRow,
  SettingsGroup,
  SwitchRow,
} from "./settings-ui";

/* ------------------------------------------------------------------------ */
/* Theme card                                                                */
/* ------------------------------------------------------------------------ */

function ThemeCard({
  theme,
  active,
  sample,
  onSelect,
}: {
  theme: ThemeDefinition;
  active: boolean;
  sample: string;
  onSelect: () => void;
}) {
  const { tokens } = theme;
  const fonts = resolveThemeFonts(theme.fonts);
  const ink = tokens.gray1000;
  const muted = tokens.gray900;
  const accent = tokens.focusColor;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={`${theme.name} theme — ${describeFonts(theme.fonts)}`}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full min-w-0 flex-col overflow-hidden rounded-[12px] bg-[var(--ds-background-elevated)] text-left transition-shadow ds-focus",
        active
          ? "ring-2 ring-[var(--ds-focus-color)]"
          : "ds-border hover:shadow-[var(--ds-shadow-border-medium)]",
      )}
    >
      {/* Rendered in the theme's own colors and fonts. */}
      <div
        className="relative px-3.5 pt-3 pb-3.5"
        style={{ background: tokens.background100, color: ink }}
        aria-hidden
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="min-w-0 truncate text-[17px] leading-6 font-semibold tracking-[-0.02em]"
            style={{
              fontFamily: fontStack(fonts.heading),
              fontFeatureSettings: FONT_OPTIONS[fonts.heading].features,
            }}
          >
            {theme.name}
          </span>
          <span className="flex shrink-0 gap-1">
            <span className="size-2.5 rounded-full" style={{ background: accent }} />
            <span className="size-2.5 rounded-full" style={{ background: muted }} />
          </span>
        </div>
        <div
          className="mt-2 rounded-[8px] px-2.5 py-2"
          style={{
            background: tokens.backgroundElevated,
            boxShadow: `0 0 0 1px ${ink}14`,
          }}
        >
          <span
            className="block text-[10px] leading-4"
            style={{
              color: muted,
              fontFamily: fontStack(fonts.heading),
              fontFeatureSettings: FONT_OPTIONS[fonts.heading].features,
            }}
          >
            Spent this month
          </span>
          <span
            className="block truncate text-[19px] leading-6 font-semibold"
            style={{
              fontFamily: fontStack(fonts.heading),
              fontFeatureSettings: FONT_OPTIONS[fonts.heading].features,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {sample}
          </span>
          <span
            className="mt-1 inline-block rounded-[4px] px-1.5 text-[10px] leading-4"
            style={{
              fontFamily: fontStack(fonts.mono),
              fontVariantNumeric: "tabular-nums",
              background: `${accent}1f`,
              color: accent,
            }}
          >
            +2.4% · 0123456789
          </span>
        </div>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2 px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-[var(--ds-gray-1000)]">
            {theme.description || theme.name}
          </p>
          <p className="truncate text-[11px] text-[var(--ds-gray-700)]">
            {describeFonts(theme.fonts)}
          </p>
        </div>
        {active ? (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--ds-focus-color)] text-white">
            <Check size={13} strokeWidth={2.5} aria-hidden />
          </span>
        ) : null}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------------ */
/* Appearance section                                                        */
/* ------------------------------------------------------------------------ */

type AppearancePatch = Partial<
  Pick<UserPreferences, "density" | "reduce_motion" | "font_scale">
>;

/**
 * Theme gallery (each theme carries its own font pairing) plus display
 * preferences. Everything applies instantly and saves automatically.
 */
export function AppearanceSection() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { activeThemeId, presetThemes, customThemes, setTheme, updateTheme } =
    useTheme();
  const { prefs, apply, save } = usePreferences();
  const densityLabel = useId();
  const pairingLabel = useId();
  const scaleId = useId();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const sample = formatCurrency(12450, user?.currency || "INR");
  const activeCustom = customThemes.find((t) => t.id === activeThemeId);

  function changeDisplay(patch: AppearancePatch) {
    apply(patch);
    setSavingState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void save()
        .then(({ queued }) => {
          setSavingState("saved");
          if (queued) {
            showToast({
              title: "Saved on this device",
              description: "Display settings will sync when you're online.",
              tone: "info",
            });
          }
        })
        .catch((err) => {
          setSavingState("idle");
          showToast({
            title: "Could not save display settings",
            description: getErrorMessage(err),
            tone: "error",
          });
        });
    }, 700);
  }

  function selectTheme(theme: ThemeDefinition) {
    if (theme.id === activeThemeId) return;
    setTheme(theme.id);
    showToast({
      title: `${theme.name} theme`,
      description: `Fonts: ${describeFonts(theme.fonts)}`,
      tone: "success",
      duration: 2500,
    });
  }

  function setCustomPairing(pairingId: string) {
    if (!activeCustom) return;
    const pairing = FONT_PAIRINGS.find((p) => p.id === pairingId);
    if (!pairing) return;
    updateTheme(activeCustom.id, {
      name: activeCustom.name,
      background100: activeCustom.tokens.background100,
      backgroundElevated: activeCustom.tokens.backgroundElevated,
      gray1000: activeCustom.tokens.gray1000,
      gray900: activeCustom.tokens.gray900,
      focusColor: activeCustom.tokens.focusColor,
      fonts: pairing.fonts,
    });
    // The theme listener re-applies the active theme (colors + fonts).
  }

  return (
    <div className="space-y-4">
      <SettingsGroup
        title="Theme"
        description="Each theme has its own colors and type pairing — switching theme also switches the fonts. Saved to your account and applied on every device."
        bodyClassName="[&>*+*]:border-t-0"
      >
        <div
          role="radiogroup"
          aria-label="Theme"
          className="grid grid-cols-1 gap-3 pt-2 pb-4 min-[420px]:grid-cols-2 xl:grid-cols-3"
        >
          {[...presetThemes, ...customThemes].map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              sample={sample}
              active={theme.id === activeThemeId}
              onSelect={() => selectTheme(theme)}
            />
          ))}
        </div>
      </SettingsGroup>

      {activeCustom ? (
        <SettingsGroup
          title="Custom theme fonts"
          description={`Pick the type pairing for “${activeCustom.name}”.`}
        >
          <SettingRow label="Font pairing" labelId={pairingLabel}>
            <SearchSelect
              ariaLabelledBy={pairingLabel}
              value={pairingIdFor(activeCustom.fonts)}
              options={FONT_PAIRINGS.map((pairing) => ({
                value: pairing.id,
                label: pairing.label,
                hint: FONT_OPTIONS[pairing.fonts.mono].label,
              }))}
              onChange={setCustomPairing}
              searchPlaceholder="Search pairings"
            />
          </SettingRow>
        </SettingsGroup>
      ) : null}

      <SettingsGroup
        title="Display"
        description={
          <>
            Applies instantly on this device and syncs to your account.{" "}
            <span aria-live="polite" className="text-[var(--ds-gray-900)]">
              {savingState === "saving"
                ? "Saving…"
                : savingState === "saved"
                  ? "Saved."
                  : ""}
            </span>
          </>
        }
      >
        <SettingRow
          label="Density"
          labelId={densityLabel}
          description="Compact tightens padding and spacing to fit more on screen."
        >
          <Segmented
            ariaLabelledBy={densityLabel}
            value={prefs.density}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
            onChange={(density) => changeDisplay({ density })}
          />
        </SettingRow>
        <SettingRow
          label="Text size"
          htmlFor={scaleId}
          description="Scales text and spacing across the app."
        >
          <div className="flex items-center gap-3">
            <span aria-hidden className="text-[12px] text-[var(--ds-gray-700)]">
              A
            </span>
            <input
              id={scaleId}
              type="range"
              min={FONT_SCALE_MIN}
              max={FONT_SCALE_MAX}
              step={FONT_SCALE_STEP}
              value={prefs.font_scale}
              aria-valuetext={`${prefs.font_scale}%`}
              onChange={(e) =>
                changeDisplay({ font_scale: Number(e.target.value) })
              }
              className="h-11 min-w-0 flex-1 cursor-pointer accent-[var(--ds-focus-color)]"
            />
            <span aria-hidden className="text-[17px] text-[var(--ds-gray-700)]">
              A
            </span>
            <span className="w-11 shrink-0 text-right text-[12.5px] font-medium tabular-nums text-[var(--ds-gray-1000)]">
              {prefs.font_scale}%
            </span>
          </div>
        </SettingRow>
        <SwitchRow
          id="settings-reduce-motion"
          label="Reduce motion"
          description="Turn off animations and transitions. Your device's reduced-motion setting is always respected."
          checked={prefs.reduce_motion}
          onChange={(reduce_motion) => changeDisplay({ reduce_motion })}
        />
      </SettingsGroup>
    </div>
  );
}

/** @deprecated use AppearanceSection */
export const ThemeSettings = AppearanceSection;
