let activeRequests = 0;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function beginApiActivity() {
  activeRequests += 1;
  emitChange();
}

export function endApiActivity() {
  activeRequests = Math.max(0, activeRequests - 1);
  emitChange();
}

export function subscribeToApiActivity(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getApiActivityCount() {
  return activeRequests;
}
