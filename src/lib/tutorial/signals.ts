import { useEffect, useRef } from "react";

/**
 * Glue between the guided tutorial's hands-on steps and the real app:
 * - The create APIs emit a signal when a create succeeds (online or queued
 *   offline), so the tour knows the user finished the task.
 * - Pages register a handler that opens their own create form, so the tour
 *   can open it without knowing the page's internals.
 */

export type TutorialTaskKind =
  | "create-account"
  | "create-transaction"
  | "create-budget";

const SIGNAL_EVENT = "opal:tutorial-signal";

export function emitTutorialSignal(kind: TutorialTaskKind) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SIGNAL_EVENT, { detail: kind }));
}

export function onTutorialSignal(
  listener: (kind: TutorialTaskKind) => void,
): () => void {
  const handle = (event: Event) => {
    listener((event as CustomEvent<TutorialTaskKind>).detail);
  };
  window.addEventListener(SIGNAL_EVENT, handle);
  return () => window.removeEventListener(SIGNAL_EVENT, handle);
}

const openers = new Map<TutorialTaskKind, () => void>();
let pendingOpen: TutorialTaskKind | null = null;

/**
 * Open the create form for `kind`. When its page is not mounted yet (the
 * tour is still navigating there), the request waits for the page to
 * register and runs then.
 */
export function requestTutorialCreate(kind: TutorialTaskKind) {
  const open = openers.get(kind);
  if (open) {
    pendingOpen = null;
    open();
  } else {
    pendingOpen = kind;
  }
}

export function cancelTutorialCreate() {
  pendingOpen = null;
}

/** Let the tutorial open this page's create form. */
export function useTutorialCreateHandler(
  kind: TutorialTaskKind,
  open: () => void,
  enabled = true,
) {
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    if (!enabled) return;
    const handler = () => openRef.current();
    openers.set(kind, handler);
    if (pendingOpen === kind) {
      pendingOpen = null;
      handler();
    }
    return () => {
      if (openers.get(kind) === handler) openers.delete(kind);
    };
  }, [enabled, kind]);
}
