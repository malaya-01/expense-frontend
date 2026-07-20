import { PRESET_THEMES } from "./presets";
import { applyThemeTokens } from "./apply";
import type { ThemeDefinition } from "./types";
import { CUSTOM_THEMES_KEY, THEME_STORAGE_KEY } from "./types";

/** Apply saved theme before React hydrates to avoid flash and ensure persistence. */
export function getThemeBootstrapScript(): string {
  const presetPayload = PRESET_THEMES.map((theme) => ({
    id: theme.id,
    tokens: theme.tokens,
  }));

  return `(function(){try{
    var PRESETS=${JSON.stringify(presetPayload)};
    var activeId=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||${JSON.stringify(PRESET_THEMES[0].id)};
    var custom=JSON.parse(localStorage.getItem(${JSON.stringify(CUSTOM_THEMES_KEY)})||"[]");
  var theme=PRESETS.find(function(t){return t.id===activeId;});
  if(!theme&&Array.isArray(custom)){theme=custom.find(function(t){return t.id===activeId;});}
  if(!theme){theme=PRESETS[0];}
  var tokens=theme.tokens;
  var root=document.documentElement;
  var alpha=tokens.shadowAlpha||"0.08";
  var ring=tokens.background200;
  root.style.setProperty("--ds-background-100",tokens.background100);
  root.style.setProperty("--ds-background-200",tokens.background200);
  root.style.setProperty("--ds-background-elevated",tokens.backgroundElevated);
  root.style.setProperty("--ds-gray-100",tokens.gray100);
  root.style.setProperty("--ds-gray-1000",tokens.gray1000);
  root.style.setProperty("--ds-gray-900",tokens.gray900);
  root.style.setProperty("--ds-gray-700",tokens.gray700);
  root.style.setProperty("--ds-focus-color",tokens.focusColor);
  root.style.setProperty("--ds-focus-input",tokens.focusInput);
  root.style.setProperty("--ds-focus-ring-inner",tokens.focusRingInner);
  root.style.setProperty("--ds-primary-hover",tokens.primaryHover);
  root.style.setProperty("--ds-primary-foreground",tokens.primaryForeground);
  root.style.setProperty("--ds-danger-hover",tokens.dangerHover);
  root.style.setProperty("--ds-shadow-border-base","0 0 0 1px rgba(0, 0, 0, "+alpha+")");
  root.style.setProperty("--ds-shadow-border","0 0 0 1px rgba(0, 0, 0, "+alpha+"), 0 0 0 1px "+ring);
  root.style.setProperty("--ds-focus-ring","0 0 0 2px "+tokens.focusRingInner+", 0 0 0 4px "+tokens.focusColor);
  root.style.setProperty("--header-border-bottom","0 1px 0 0 rgba(0, 0, 0, "+(tokens.headerBorderAlpha||"0.1")+")");
  root.dataset.theme=theme.id;
  }catch(e){}})();`;
}

export function readStoredThemeSnapshot(): {
  activeThemeId: string;
  customThemes: ThemeDefinition[];
} {
  if (typeof window === "undefined") {
    return { activeThemeId: PRESET_THEMES[0].id, customThemes: [] };
  }
  try {
    const activeThemeId =
      localStorage.getItem(THEME_STORAGE_KEY) || PRESET_THEMES[0].id;
    const customThemes = JSON.parse(
      localStorage.getItem(CUSTOM_THEMES_KEY) || "[]",
    ) as ThemeDefinition[];
    return {
      activeThemeId,
      customThemes: Array.isArray(customThemes) ? customThemes : [],
    };
  } catch {
    return { activeThemeId: PRESET_THEMES[0].id, customThemes: [] };
  }
}

export function applyStoredThemeFromBrowser() {
  if (typeof window === "undefined") return;
  const { activeThemeId, customThemes } = readStoredThemeSnapshot();
  const preset = PRESET_THEMES.find((t) => t.id === activeThemeId);
  const custom = customThemes.find((t) => t.id === activeThemeId);
  const theme = preset || custom || PRESET_THEMES[0];
  applyThemeTokens(theme.tokens);
  document.documentElement.dataset.theme = theme.id;
}
