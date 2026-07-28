export type NetworkListener = (online: boolean) => void;

let cachedOnline =
  typeof navigator === "undefined" ? true : navigator.onLine !== false;

const listeners = new Set<NetworkListener>();

function emit(online: boolean) {
  cachedOnline = online;
  listeners.forEach((fn) => fn(online));
}

export function isOnline(): boolean {
  return cachedOnline;
}

export function subscribeNetwork(listener: NetworkListener): () => void {
  listeners.add(listener);
  listener(cachedOnline);
  return () => listeners.delete(listener);
}

export async function initNetworkMonitor(): Promise<void> {
  if (typeof window === "undefined") return;

  window.addEventListener("online", () => emit(true));
  window.addEventListener("offline", () => emit(false));
  emit(navigator.onLine !== false);

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { Network } = await import("@capacitor/network");
    const status = await Network.getStatus();
    emit(status.connected);
    Network.addListener("networkStatusChange", (s) => emit(s.connected));
  } catch {
    // Capacitor not installed yet — browser events are enough.
  }
}
