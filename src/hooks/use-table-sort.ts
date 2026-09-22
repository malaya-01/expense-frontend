"use client";

import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export function useTableSort<
  T,
  C extends Record<string, (a: T, b: T) => number>,
>(
  items: T[],
  options: {
    initialKey: keyof C & string;
    initialDir?: SortDir;
    comparators: C;
  },
) {
  type K = keyof C & string;
  const [sortKey, setSortKey] = useState<K>(options.initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(
    options.initialDir ?? "desc",
  );

  function toggle(key: K) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(
      key === "date" ||
        key === "amount" ||
        key === "due" ||
        key === "balance" ||
        key === "payment" ||
        key === "principal" ||
        key === "interest"
        ? "desc"
        : "asc",
    );
  }

  const sorted = useMemo(() => {
    const compare = options.comparators[sortKey];
    if (!compare) return items;
    const next = [...items];
    next.sort((a, b) => {
      const result = compare(a, b);
      return sortDir === "asc" ? result : -result;
    });
    return next;
  }, [items, options.comparators, sortDir, sortKey]);

  return { sorted, sortKey, sortDir, toggle };
}
