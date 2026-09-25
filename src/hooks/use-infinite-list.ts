"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export const DEFAULT_INFINITE_PAGE_SIZE = 20;

export type InfiniteListState<T> = {
  items: T[];
  total: number;
  visibleCount: number;
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
};

export function useInfiniteList<T>(
  items: T[],
  options?: { pageSize?: number; resetKey?: string | number },
): InfiniteListState<T> {
  const pageSize = options?.pageSize ?? DEFAULT_INFINITE_PAGE_SIZE;
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [options?.resetKey, pageSize]);

  const loadMore = useCallback(() => {
    setVisibleCount((count) => Math.min(count + pageSize, items.length));
  }, [items.length, pageSize]);

  const reset = useCallback(() => {
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
      loadMore,
      reset,
    };
  }, [items, visibleCount, loadMore, reset]);
}
