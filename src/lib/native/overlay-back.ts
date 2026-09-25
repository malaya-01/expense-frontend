"use client";

import { useEffect, useRef } from "react";

type OverlayCloser = () => void;

const stack: OverlayCloser[] = [];

/** Register an open overlay so Android back closes it before navigating. */
export function registerOverlayBack(close: OverlayCloser): () => void {
  stack.push(close);
  return () => {
    const index = stack.lastIndexOf(close);
    if (index >= 0) stack.splice(index, 1);
  };
}

export function closeTopOverlay(): boolean {
  const close = stack.pop();
  if (!close) return false;
  close();
  return true;
}

export function useOverlayBack(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    return registerOverlayBack(() => onCloseRef.current());
  }, [open]);
}
