import { PRESET_THEMES } from "./presets";
import { applyBrandAssets, applyThemeTokens } from "./apply";
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
  root.style.setProperty("--ds-gray-200","color-mix(in srgb, "+tokens.gray1000+" 10%, "+tokens.backgroundElevated+")");
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
  function lin(v){v=v/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}
  function lum(hex){
    hex=String(hex||"").replace("#","");
    if(hex.length===3)hex=hex.split("").map(function(c){return c+c}).join("");
    var n=parseInt(hex,16);if(!n&&n!==0)return 1;
    return 0.2126*lin((n>>16)&255)+0.7152*lin((n>>8)&255)+0.0722*lin(n&255);
  }
  var isDark=lum(tokens.background100)<0.45;
  var slug=(theme.id||"").indexOf("preset:")===0?theme.id.slice(7):"";
  root.dataset.themeScheme=isDark?"dark":"light";
  root.style.setProperty("--brand-logo-plated",'url("'+(slug?"/brand/themes/"+slug+".png?v=4":(isDark?"/brand/logo-dark.png?v=4":"/brand/logo-light.png?v=4"))+'")');
  root.style.setProperty("--brand-logo-mark",'url("'+(isDark?"/brand/logo-mark-on-dark.png?v=4":"/brand/logo-mark-on-light.png?v=4")+'")');
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
  applyBrandAssets(theme.tokens, theme.id);
  document.documentElement.dataset.theme = theme.id;
}
