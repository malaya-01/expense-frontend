"use client";

import { useEffect, useMemo, useState } from "react";

export const DEFAULT_PAGE_SIZE = 12;

export type PaginationState<T> = {
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  pageCount: number;
  total: number;
  items: T[];
  from: number;
  to: number;
};

export function usePagination<T>(
  items: T[],
  options?: { pageSize?: number; resetKey?: string | number },
): PaginationState<T> {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [options?.resetKey, pageSize]);

  return useMemo(() => {
    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
    const current = Math.min(Math.max(1, page), pageCount);
    const start = (current - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    return {
      page: current,
      setPage,
      pageSize,
      pageCount,
      total,
      items: pageItems,
      from: total === 0 ? 0 : start + 1,
      to: Math.min(start + pageSize, total),
    };
  }, [items, page, pageSize]);
}
