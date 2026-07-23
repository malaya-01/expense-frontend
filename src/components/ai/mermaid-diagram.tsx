"use client";

import { memo, useEffect, useId, useState } from "react";
import { sanitizeMermaidSource } from "@/lib/ai/streaming-markdown";
import { cn } from "@/lib/cn";

const svgCache = new Map<string, string>();

function preferDarkMermaidTheme(): boolean {
  if (typeof document === "undefined") return false;
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue("--ds-background-100")
    .trim();
  // Rough luminance check for hex colors like #1a1a1a / #fafafa
  const hex = bg.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45;
}

export const MermaidDiagram = memo(function MermaidDiagram({
  chart,
}: {
  chart: string;
}) {
  const reactId = useId().replace(/:/g, "");
  const source = sanitizeMermaidSource(chart);
  const cached = svgCache.get(source) || "";
  const [svg, setSvg] = useState<string>(cached);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!source) return;
    const hit = svgCache.get(source);
    if (hit) {
      setSvg(hit);
      setError("");
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const mermaid = (await import("mermaid")).default;
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "loose",
            theme: preferDarkMermaidTheme() ? "dark" : "neutral",
            fontFamily: "inherit",
          });
          const { svg: rendered } = await mermaid.render(
            `finos-mermaid-${reactId}-${Math.abs(hashString(source))}`,
            source,
          );
          if (cancelled) return;
          svgCache.set(source, rendered);
          setSvg(rendered);
          setError("");
        } catch (err) {
          if (cancelled) return;
          setSvg("");
          setError(
            err instanceof Error ? err.message : "Could not render diagram",
          );
        }
      })();
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source, reactId]);

  if (error) {
    return (
      <div className="my-3 space-y-2 rounded-[12px] border border-[color:color-mix(in_srgb,var(--ds-status-red)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-status-red)_6%,var(--ds-background-elevated))] p-3">
        <p className="text-xs font-medium text-[var(--ds-status-red)]">
          Couldn’t render this diagram
        </p>
        <pre className="overflow-x-auto text-[11px] leading-5 text-[var(--ds-gray-900)]">
          {source}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 flex min-h-24 items-center justify-center rounded-[12px] bg-[var(--ds-background-elevated)] text-xs text-[var(--ds-gray-900)]">
        Drawing diagram…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "my-3 overflow-x-auto rounded-[14px] bg-[var(--ds-background-elevated)] p-3 [&_svg]:mx-auto [&_svg]:max-w-full",
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
