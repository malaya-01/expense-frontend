"use client";

import { useEffect, useRef } from "react";

export function InfiniteScrollSentinel({
  hasMore,
  onLoadMore,
  loading,
  disabled,
  label = "Loading more…",
}: {
  hasMore: boolean;
  onLoadMore: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const busy = Boolean(loading || disabled);

  useEffect(() => {
    if (!hasMore || busy) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { root: null, rootMargin: "120px 0px", threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, busy, onLoadMore]);

  if (!hasMore && !loading) return null;

  return (
    <div
      ref={ref}
      className="flex items-center justify-center gap-2 py-5 text-xs text-[var(--ds-gray-700)]"
      role="status"
      aria-live="polite"
      aria-busy={loading ? "true" : "false"}
    >
      {loading || hasMore ? (
        <>
          <span
            className="inline-block size-4 animate-spin rounded-full border-2 border-[var(--ds-gray-500)] border-t-[var(--ds-gray-1000)]"
            aria-hidden
          />
          <span>{label}</span>
        </>
      ) : null}
    </div>
  );
}
