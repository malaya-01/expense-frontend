"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

function pageWindow(page: number, pageCount: number): Array<number | "…"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const items: Array<number | "…"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) items.push("…");
  for (let n = start; n <= end; n += 1) items.push(n);
  if (end < pageCount - 1) items.push("…");
  items.push(pageCount);
  return items;
}

export function Pagination({
  page,
  pageCount,
  total,
  from,
  to,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (total <= 0) return null;

  const window = pageWindow(page, pageCount);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-[12px] tabular-nums text-[var(--ds-gray-700)]">
        Showing{" "}
        <span className="font-medium text-[var(--ds-gray-1000)]">{from}</span>
        –<span className="font-medium text-[var(--ds-gray-1000)]">{to}</span> of{" "}
        <span className="font-medium text-[var(--ds-gray-1000)]">{total}</span>
      </p>
      {pageCount > 1 ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex size-8 items-center justify-center rounded-[9px] text-[var(--ds-gray-900)] transition-colors hover:bg-[var(--ds-gray-100)] disabled:pointer-events-none disabled:opacity-35 ds-focus"
          >
            <ChevronLeft size={16} />
          </button>
          {window.map((item, index) =>
            item === "…" ? (
              <span
                key={`gap-${index}`}
                className="px-1 text-[12px] text-[var(--ds-gray-700)]"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                onClick={() => onPageChange(item)}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-[9px] text-[12px] font-medium tabular-nums transition-colors ds-focus",
                  item === page
                    ? "bg-[var(--ds-gray-1000)] text-[var(--ds-primary-foreground)]"
                    : "text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)]",
                )}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex size-8 items-center justify-center rounded-[9px] text-[var(--ds-gray-900)] transition-colors hover:bg-[var(--ds-gray-100)] disabled:pointer-events-none disabled:opacity-35 ds-focus"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
