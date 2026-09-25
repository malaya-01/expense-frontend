"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const DEFAULT_INFINITE_PAGE_SIZE = 20;
const LOAD_MORE_DELAY_MS = 380;

export type InfiniteListState<T> = {
  items: T[];
  total: number;
  visibleCount: number;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  reset: () => void;
};

export function useInfiniteList<T>(
  items: T[],
  options?: { pageSize?: number; resetKey?: string | number },
): InfiniteListState<T> {
  const pageSize = options?.pageSize ?? DEFAULT_INFINITE_PAGE_SIZE;
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    loadingRef.current = false;
    setLoadingMore(false);
    setVisibleCount(pageSize);
  }, [options?.resetKey, pageSize]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    if (visibleCount >= items.length) return;

    loadingRef.current = true;
    setLoadingMore(true);

    timerRef.current = setTimeout(() => {
      setVisibleCount((count) => Math.min(count + pageSize, items.length));
      loadingRef.current = false;
      setLoadingMore(false);
      timerRef.current = null;
    }, LOAD_MORE_DELAY_MS);
  }, [items.length, pageSize, visibleCount]);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    loadingRef.current = false;
    setLoadingMore(false);
    setVisibleCount(pageSize);
  }, [pageSize]);

  return useMemo(() => {
    const total = items.length;
    const capped = Math.min(visibleCount, total);
    return {
      items: items.slice(0, capped),
      total,
      visibleCount: capped,
      hasMore: capped < total,
      loadingMore,
      loadMore,
      reset,
    };
  }, [items, visibleCount, loadingMore, loadMore, reset]);
}
