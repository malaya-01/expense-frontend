import type { ThemeDefinition, ThemeTokens } from "./types";

function shadowBorder(alpha: string, ring: string) {
  return `0 0 0 1px rgba(0, 0, 0, ${alpha}), 0 0 0 1px ${ring}`;
}

function shadowMedium(alpha: string) {
  return `0 0 0 1px rgba(0, 0, 0, ${alpha}), 0 2px 2px rgba(0, 0, 0, ${Number(alpha) * 0.5}), 0 8px 8px -8px rgba(0, 0, 0, ${Number(alpha) * 0.5})`;
}

function shadowMenu(alpha: string) {
  return `0 0 0 1px rgba(0, 0, 0, ${alpha}), 0 1px 1px rgba(0, 0, 0, ${Number(alpha) * 0.25}), 0 4px 8px -4px rgba(0, 0, 0, ${Number(alpha) * 0.5}), 0 16px 24px -8px rgba(0, 0, 0, ${Number(alpha) * 0.75})`;
}

function shadowModal(alpha: string) {
  return `0 0 0 1px rgba(0, 0, 0, ${alpha}), 0 1px 1px rgba(0, 0, 0, ${Number(alpha) * 0.25}), 0 8px 16px -4px rgba(0, 0, 0, ${Number(alpha) * 0.5}), 0 24px 32px -8px rgba(0, 0, 0, ${Number(alpha) * 0.75})`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const num = parseInt(value, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function selectionColor(focus: string, alpha: string) {
  try {
    const { r, g, b } = hexToRgb(focus);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return `rgba(0, 114, 245, ${alpha})`;
  }
}

export function applyThemeTokens(tokens: ThemeTokens, root: HTMLElement = document.documentElement) {
  const alpha = tokens.shadowAlpha;
  const ring = tokens.background200;

  root.style.setProperty("--ds-background-100", tokens.background100);
  root.style.setProperty("--ds-background-200", tokens.background200);
  root.style.setProperty("--ds-background-elevated", tokens.backgroundElevated);
  root.style.setProperty("--ds-gray-100", tokens.gray100);
  root.style.setProperty(
    "--ds-gray-200",
    `color-mix(in srgb, ${tokens.gray1000} 10%, ${tokens.backgroundElevated})`,
  );
  root.style.setProperty("--ds-gray-1000", tokens.gray1000);
  root.style.setProperty("--ds-gray-900", tokens.gray900);
  root.style.setProperty("--ds-gray-700", tokens.gray700);
  root.style.setProperty("--ds-focus-color", tokens.focusColor);
  root.style.setProperty("--ds-focus-input", tokens.focusInput);
  root.style.setProperty("--ds-focus-ring-inner", tokens.focusRingInner);
  root.style.setProperty("--ds-primary-hover", tokens.primaryHover);
  root.style.setProperty("--ds-primary-foreground", tokens.primaryForeground);
  root.style.setProperty("--ds-danger-hover", tokens.dangerHover);
  root.style.setProperty(
    "--ds-shadow-border-base",
    `0 0 0 1px rgba(0, 0, 0, ${alpha})`,
  );
  root.style.setProperty("--ds-shadow-border", shadowBorder(alpha, ring));
  root.style.setProperty("--ds-shadow-border-medium", shadowMedium(alpha));
  root.style.setProperty("--ds-shadow-menu", shadowMenu(alpha));
  root.style.setProperty("--ds-shadow-modal", shadowModal(alpha));
  root.style.setProperty(
    "--ds-focus-ring",
    `0 0 0 2px ${tokens.focusRingInner}, 0 0 0 4px ${tokens.focusColor}`,
  );
  root.style.setProperty(
    "--header-border-bottom",
    `0 1px 0 0 rgba(0, 0, 0, ${tokens.headerBorderAlpha})`,
  );
  root.style.setProperty(
    "--ds-selection-bg",
    selectionColor(tokens.focusColor, tokens.selectionAlpha),
  );
}

export function applyTheme(theme: ThemeDefinition) {
  applyThemeTokens(theme.tokens);
  document.documentElement.dataset.theme = theme.id;
}
