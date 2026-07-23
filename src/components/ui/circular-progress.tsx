"use client";

import { cn } from "@/lib/cn";

/**
 * Determinate circular progress (ChatGPT-style).
 * Uses pathLength=100 so the arc reliably fills 0→100.
 */
export function CircularProgress({
  value,
  size = 28,
  strokeWidth = 2.5,
  className,
  trackClassName,
  indicatorClassName,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
}) {
  const progress = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("-rotate-90", className)}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        pathLength={100}
        strokeWidth={strokeWidth}
        stroke="currentColor"
        className={cn("text-white/30", trackClassName)}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        pathLength={100}
        strokeWidth={strokeWidth}
        stroke="currentColor"
        strokeLinecap="round"
        strokeDasharray={`${progress} 100`}
        className={cn(
          "text-white transition-[stroke-dasharray] duration-200 ease-out",
          indicatorClassName,
        )}
      />
    </svg>
  );
}
