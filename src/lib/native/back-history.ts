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

function currentPath() {
  return (window.location.pathname || "/").replace(/\/$/, "") || "/";
}

/** Dashboard is the only screen that can exit the app. */
export function isDashboardAnchor(path = currentPath()) {
  return path === "/" || path === "/dashboard";
}
