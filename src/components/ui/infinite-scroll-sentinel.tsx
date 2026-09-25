"use client";

import { useEffect, useRef } from "react";

export function InfiniteScrollSentinel({
  hasMore,
  onLoadMore,
  disabled,
  label = "Loading more…",
}: {
  hasMore: boolean;
  onLoadMore: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || disabled) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { root: null, rootMargin: "240px 0px", threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, disabled, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div
      ref={ref}
      className="flex items-center justify-center py-4 text-xs text-[var(--ds-gray-700)]"
      aria-hidden
    >
      {label}
    </div>
  );
}
