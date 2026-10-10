"use client";

let depth = 0;
let patched = false;

/**
 * Next.js client navigations use history.pushState. Capacitor's
 * `canGoBack` can miss those, so we count in-app pushes ourselves.
 */
export function installHistoryDepthTracker() {
  if (patched || typeof window === "undefined") return;
  patched = true;

  const originalPush = window.history.pushState.bind(window.history);
  window.history.pushState = function pushState(
    ...args: Parameters<History["pushState"]>
  ) {
    originalPush(...args);
    depth += 1;
  };

  window.addEventListener("popstate", () => {
    depth = Math.max(0, depth - 1);
  });
}

export function hasInAppHistory() {
  return depth > 0;
}

/** Drop the push count after a forced sign-out so Back does not replay it. */
export function resetHistoryDepth() {
  depth = 0;
}

function currentPath() {
  return (window.location.pathname || "/").replace(/\/$/, "") || "/";
}

/** Dashboard is the only signed-in screen that can exit the app. */
export function isDashboardAnchor(path = currentPath()) {
  return path === "/" || path === "/dashboard";
}

/**
 * Screens where Android back (with no in-app history) offers to exit instead
 * of navigating. Includes the auth entry screens so a signed-out user on
 * /signin is not bounced to /dashboard → /signin forever.
 */
export function isExitAnchor(path = currentPath()) {
  return (
    isDashboardAnchor(path) || path === "/signin" || path === "/signup"
  );
}

/** Sign-in and sign-up. Back here leaves the app; it must not return to it. */
export function isAuthEntry(path = currentPath()) {
  return path === "/signin" || path === "/signup";
}

/** Where back should land when there is no history and we're not an anchor. */
export function backFallbackPath(hasAccessToken: boolean) {
  return hasAccessToken ? "/dashboard" : "/signin";
}
