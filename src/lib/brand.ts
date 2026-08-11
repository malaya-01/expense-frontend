/** Product name shown in the UI, tab title, and Android launcher. */
export const APP_NAME = "Opal";

export const APP_SLUG = "opal";

export const APP_TAGLINE = "Money, made calm.";

export const APP_DESCRIPTION =
  "A private, local-first money app for accounts, spending, and goals.";

export const APP_VERSION = "0.1.0";

export const LOGO_SRC = "/brand/logo.png";
export const LOGO_DARK_SRC = "/brand/logo-dark.png";
export const LOGO_LIGHT_SRC = "/brand/logo-light.png";
export const LOGO_MARK_SRC = "/brand/logo-mark.png";
export const LOGO_MARK_ON_DARK_SRC = "/brand/logo-mark-on-dark.png";
export const LOGO_MARK_ON_LIGHT_SRC = "/brand/logo-mark-on-light.png";

export type BrandScheme = "dark" | "light";

/** Bump when theme plates are regenerated so the browser does not keep the old identical icons. */
const BRAND_ASSET_VERSION = "4";

function withVersion(src: string) {
  return `${src}?v=${BRAND_ASSET_VERSION}`;
}

export function platedLogoSrc(themeId: string, scheme: BrandScheme) {
  if (themeId.startsWith("preset:")) {
    return withVersion(`/brand/themes/${themeId.slice("preset:".length)}.png`);
  }
  return withVersion(scheme === "dark" ? LOGO_DARK_SRC : LOGO_LIGHT_SRC);
}

export function markLogoSrc(scheme: BrandScheme) {
  return withVersion(
    scheme === "dark" ? LOGO_MARK_ON_DARK_SRC : LOGO_MARK_ON_LIGHT_SRC,
  );
}
