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
    <div className={cn("mb-3 flex flex-wrap items-center gap-1.5", className)}>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--ds-focus-color)_12%,transparent)] px-2.5 py-1 text-[11px] font-medium text-[var(--ds-focus-color)]">
        <Sparkles size={12} />
        Vision
      </span>
      <span className="rounded-full bg-[var(--ds-gray-100)] px-2.5 py-1 text-[11px] font-medium text-[var(--ds-gray-1000)]">
        {source.provider}
      </span>
      <span className="rounded-full bg-[var(--ds-background-100)] px-2.5 py-1 font-mono text-[11px] text-[var(--ds-gray-700)]">
        {source.model}
      </span>
    </div>
  );
}
