"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SortDir } from "@/hooks/use-table-sort";

export function SortableTh({
  label,
  active,
  direction,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  active: boolean;
  direction: SortDir;
  onSort: () => void;
  align?: "left" | "right";
  className?: string;
}) {
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={cn(
        "px-5 py-3 font-medium",
        align === "right" && "text-right",
        className,
      )}
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[6px] uppercase tracking-[0.08em] transition-colors ds-focus",
          align === "right" && "flex-row-reverse",
          active
            ? "text-[var(--ds-gray-1000)]"
            : "text-[var(--ds-gray-700)] hover:text-[var(--ds-gray-1000)]",
        )}
      >
        <span>{label}</span>
        <Icon
          size={12}
          strokeWidth={2}
          className={cn(
            "shrink-0",
            active ? "opacity-100" : "opacity-45",
          )}
          aria-hidden
        />
      </button>
    </th>
  );
}
