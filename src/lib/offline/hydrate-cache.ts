const FRESH_MS = 20_000;

const inflight = new Map<string, Promise<void>>();
const lastOk = new Map<string, number>();

export function isHydrateFresh(key: string): boolean {
  const at = lastOk.get(key);
  return at != null && Date.now() - at < FRESH_MS;
}

export function markHydrateFresh(key: string): void {
  lastOk.set(key, Date.now());
}

export function invalidateHydrate(key?: string): void {
  if (key) {
    lastOk.delete(key);
    return;
  }
  lastOk.clear();
}

/** Deduplicate concurrent hydrates for the same table. */
export function runHydrate(
  key: string,
  fn: () => Promise<void>,
  options?: { force?: boolean },
): Promise<void> {
  if (!options?.force && isHydrateFresh(key)) return Promise.resolve();
  const existing = inflight.get(key);
  if (existing) return existing;
  const next = fn()
    .then(() => {
      markHydrateFresh(key);
    })
    .finally(() => {
      if (inflight.get(key) === next) inflight.delete(key);
    });
  inflight.set(key, next);
  return next;
}

export function notifyDataUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("finos:data-updated"));
}
