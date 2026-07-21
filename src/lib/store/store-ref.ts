import type { AppStore } from "./index";

let appStore: AppStore | null = null;

export function setAppStore(store: AppStore) {
  appStore = store;
}

export function getAppStore(): AppStore | null {
  return appStore;
}
