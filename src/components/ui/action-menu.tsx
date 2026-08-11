"use client";

import { useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";

export type MenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
};

export function ActionMenu({
  items,
  label = "Open menu",
  align = "end",
  trigger,
}: {
  items: MenuItem[];
  label?: string;
  align?: "start" | "end";
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align={align}
      className="w-44 p-1.5"
      triggerLabel={label}
      trigger={
        trigger || (
          <span
            className="inline-flex size-7 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]"
            aria-label={label}
          >
            <MoreHorizontal size={15} />
          </span>
        )
      }
    >
      <div role="menu" aria-label={label} className="space-y-0.5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              item.onSelect();
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center rounded-[8px] px-2.5 py-2 text-left text-xs transition-colors ds-focus disabled:opacity-40",
              item.tone === "danger"
                ? "text-[var(--ds-status-red)] hover:bg-[var(--ds-danger-hover)]"
                : "text-[var(--ds-gray-1000)] hover:bg-[var(--ds-gray-100)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </Popover>
  );
}
