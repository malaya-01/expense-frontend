import { isNativeClient } from "@/lib/runtime-platform";

/** Public product documentation base path (unauthenticated). */
export const DOCUMENTATION_BASE = "/documentation";

/**
 * Canonical web portal origin for opening docs outside the native shell.
 * Override with NEXT_PUBLIC_WEB_PORTAL_URL in env / mobile builds.
 */
export function getWebPortalOrigin(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_WEB_PORTAL_URL || "").replace(
    /\/$/,
    "",
  );
  if (fromEnv) return fromEnv;
  return "https://expense-frontend-theta-two.vercel.app";
}

export function documentationPath(slug?: string): string {
  if (!slug) return DOCUMENTATION_BASE;
  return `${DOCUMENTATION_BASE}/${slug}`;
}

/** Absolute URL on the web portal for a docs path. */
export function documentationPortalUrl(path = DOCUMENTATION_BASE): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getWebPortalOrigin()}${normalized}`;
}

/**
 * Open documentation outside the authenticated app chrome:
 * - Native (Capacitor): external browser → web portal
 * - Web: new browser tab
 */
export function openDocumentation(path: string = DOCUMENTATION_BASE): void {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return;

  if (isNativeClient()) {
    window.open(
      documentationPortalUrl(normalized),
      "_blank",
      "noopener,noreferrer",
    );
    return;
  }

  window.open(normalized, "_blank", "noopener,noreferrer");
}
