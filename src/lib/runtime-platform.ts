/**
 * Detect whether the current runtime is a native phone/tablet app (Capacitor)
 * or a browser session, and whether the form factor is phone / tablet / desktop.
 */

export type ClientSurface = "native" | "web";
export type ClientFormFactor = "phone" | "tablet" | "desktop";
export type ClientOs =
  | "android"
  | "ios"
  | "windows"
  | "macos"
  | "linux"
  | "unknown";

export type ClientPlatform = {
  surface: ClientSurface;
  formFactor: ClientFormFactor;
  os: ClientOs;
  /** Wire value sent to the API, e.g. native-android | web-mobile | web-desktop */
  code: string;
  /** Human label for UI */
  label: string;
};

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

let cached: ClientPlatform | null = null;

function readUa(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent || "";
}

function getCapacitorBridge(): CapacitorBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
  return bridge || null;
}

function detectOsFromUa(ua: string, nativePlatform?: string): ClientOs {
  const p = (nativePlatform || "").toLowerCase();
  if (p === "android") return "android";
  if (p === "ios") return "ios";
  const lower = ua.toLowerCase();
  if (/android/.test(lower)) return "android";
  if (/iphone|ipad|ipod/.test(lower)) return "ios";
  if (/windows/.test(lower)) return "windows";
  if (/mac os x|macintosh/.test(lower)) return "macos";
  if (/linux/.test(lower)) return "linux";
  return "unknown";
}

function detectWebFormFactor(ua: string): ClientFormFactor {
  const lower = ua.toLowerCase();
  if (/ipad|tablet|kindle|silk|(android(?!.*mobile))/.test(lower)) {
    return "tablet";
  }
  if (
    /mobi|iphone|ipod|android.*mobile|windows phone|opera mini|iemobile/.test(
      lower,
    )
  ) {
    return "phone";
  }

  // Touch + narrow viewport → treat as phone even if UA looks desktop
  if (typeof window !== "undefined") {
    const coarse =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.innerWidth > 0 && window.innerWidth < 768;
    const touchPoints =
      typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0;
    if (coarse && narrow && touchPoints > 0) return "phone";
    if (coarse && touchPoints > 1 && window.innerWidth < 1024) return "tablet";
  }
  return "desktop";
}

function buildLabel(
  surface: ClientSurface,
  formFactor: ClientFormFactor,
  os: ClientOs,
): string {
  if (surface === "native") {
    const osLabel =
      os === "android" ? "Android" : os === "ios" ? "iOS" : "mobile";
    return formFactor === "tablet"
      ? `Tablet app (${osLabel})`
      : `Phone app (${osLabel})`;
  }
  if (formFactor === "phone") return "Web (phone browser)";
  if (formFactor === "tablet") return "Web (tablet browser)";
  return "Web (desktop)";
}

function buildCode(
  surface: ClientSurface,
  formFactor: ClientFormFactor,
  os: ClientOs,
): string {
  if (surface === "native") {
    return `native-${os === "unknown" ? "mobile" : os}`;
  }
  if (formFactor === "desktop") return "web-desktop";
  return "web-mobile";
}

function detectSync(): ClientPlatform {
  const ua = readUa();
  const bridge = getCapacitorBridge();
  const surface: ClientSurface = bridge?.isNativePlatform?.()
    ? "native"
    : "web";
  const nativePlatform =
    surface === "native" ? bridge?.getPlatform?.() : undefined;

  const os = detectOsFromUa(ua, nativePlatform);
  const formFactor: ClientFormFactor =
    surface === "native"
      ? nativePlatform === "ios" && /ipad/i.test(ua)
        ? "tablet"
        : "phone"
      : detectWebFormFactor(ua);

  return {
    surface,
    formFactor,
    os,
    code: buildCode(surface, formFactor, os),
    label: buildLabel(surface, formFactor, os),
  };
}

/** Sync detection (safe during render / request interceptors). */
export function getClientPlatform(): ClientPlatform {
  if (typeof window === "undefined") {
    return {
      surface: "web",
      formFactor: "desktop",
      os: "unknown",
      code: "web-desktop",
      label: "Web (desktop)",
    };
  }
  if (!cached) cached = detectSync();
  return cached;
}

/** Invalidate cache after resize/orientation if form factor may change. */
export function refreshClientPlatform(): ClientPlatform {
  cached = null;
  return getClientPlatform();
}

export function isNativeClient(): boolean {
  return getClientPlatform().surface === "native";
}

export function isPhoneSession(): boolean {
  const p = getClientPlatform();
  return p.formFactor === "phone" || p.surface === "native";
}
