export const LAST_SOURCE_CONTAINER_KEY = "finos:last-source-container-id";

export function readLastSourceContainerId(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(LAST_SOURCE_CONTAINER_KEY) || "";
  } catch {
    return "";
  }
}

export function writeLastSourceContainerId(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    localStorage.setItem(LAST_SOURCE_CONTAINER_KEY, id);
  } catch {
    /* ignore */
  }
}
