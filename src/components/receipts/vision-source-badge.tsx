"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { describeVisionSource } from "@/lib/receipts/vision-source";

export function VisionSourceBadge({
  provider,
  model,
  className,
}: {
  provider?: string | null;
  model?: string | null;
  className?: string;
}) {
  const source = describeVisionSource(provider, model);
  if (!source) return null;
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ds-gray-700)]",
        className || "mb-3",
      )}
    >
      <Sparkles size={13} className="shrink-0 text-[var(--ds-gray-900)]" />
      <span>Vision</span>
      <span className="rounded-[6px] bg-[var(--ds-gray-100)] px-1.5 py-0.5 font-medium text-[var(--ds-gray-1000)]">
        {source.provider}
      </span>
      <span className="font-mono text-[11px] text-[var(--ds-gray-900)]">
        {source.model}
      </span>
    </p>
  );
}
