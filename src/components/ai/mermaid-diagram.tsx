"use client";

import {
  memo,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { ChevronRight, Maximize2, Minimize2, TriangleAlert } from "lucide-react";
import { sanitizeMermaidSource } from "@/lib/ai/streaming-markdown";
import { cn } from "@/lib/cn";

type MermaidApi = (typeof import("mermaid"))["default"];

/* ------------------------------------------------------------------------ */
/* Caches                                                                    */
/* ------------------------------------------------------------------------ */

const MAX_CACHE_ENTRIES = 40;
/** key: `${themeKey}\0${source}` → rendered SVG markup */
const svgCache = new Map<string, string>();
/** key: source → error message (syntax errors do not depend on theme) */
const errorCache = new Map<string, string>();

function remember(map: Map<string, string>, key: string, value: string) {
  if (map.has(key)) map.delete(key);
  else if (map.size >= MAX_CACHE_ENTRIES) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
  map.set(key, value);
}

/* ------------------------------------------------------------------------ */
/* Mermaid loading + serialized rendering                                    */
/* ------------------------------------------------------------------------ */

let mermaidPromise: Promise<MermaidApi> | null = null;

function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid")
      .then((mod) => mod.default)
      .catch((error) => {
        mermaidPromise = null; // allow a later retry (e.g. chunk load failure)
        throw error;
      });
  }
  return mermaidPromise;
}

// mermaid.initialize() is global, so theme + render must not interleave.
let renderQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = renderQueue.then(task, task);
  renderQueue = run.catch(() => undefined);
  return run;
}

const ID_PREFIX = "opal-mmd-";
let renderSeq = 0;

/**
 * Mermaid parks temporary nodes in <body> (`#d<id>` wrapper, `#i<id>` sandbox
 * iframe, `#<id>` svg) and, on failure, an error "bomb" SVG. Remove them all.
 */
function removeMermaidLeftovers(id?: string) {
  if (typeof document === "undefined") return;
  try {
    if (id) {
      for (const nodeId of [id, `d${id}`, `i${id}`]) {
        document.getElementById(nodeId)?.remove();
      }
    }
    document
      .querySelectorAll(
        [
          `body > [id^="${ID_PREFIX}"]`,
          `body > [id^="d${ID_PREFIX}"]`,
          `body > [id^="i${ID_PREFIX}"]`,
          // Legacy ids from the previous renderer.
          `body > [id^="dfinos-mermaid-"]`,
          `body > [id^="finos-mermaid-"]`,
        ].join(","),
      )
      .forEach((node) => node.remove());
  } catch {
    /* never let cleanup throw */
  }
}

async function renderMermaidSvg(
  source: string,
  theme: MermaidTheme,
): Promise<string> {
  return enqueue(async () => {
    const mermaid = await loadMermaid();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "base",
      darkMode: theme.dark,
      fontFamily: theme.fontFamily,
      themeVariables: theme.variables,
      flowchart: { useMaxWidth: true, htmlLabels: false },
      sequence: { useMaxWidth: true },
      gantt: { useMaxWidth: true },
    });

    // Parse first: no DOM side effects, throws a readable syntax error.
    await mermaid.parse(source);

    renderSeq += 1;
    const id = `${ID_PREFIX}${Date.now().toString(36)}-${renderSeq}`;
    // Off-screen (but attached, so text can be measured) render host.
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText =
      "position:fixed;left:-10000px;top:0;width:960px;visibility:hidden;pointer-events:none;overflow:hidden;contain:layout style;";
    document.body.appendChild(host);
    try {
      const { svg } = await mermaid.render(id, source, host);
      if (!svg || /aria-roledescription="error"/.test(svg)) {
        throw new Error("Diagram syntax error");
      }
      return svg;
    } finally {
      host.remove();
      removeMermaidLeftovers(id);
    }
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("Diagram took too long to draw")),
      ms,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function describeError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Could not render diagram";
  // Mermaid's parser messages are multi-line with a caret diagram; keep it short.
  return raw.split("\n").find((line) => line.trim())?.slice(0, 200) || raw;
}

/* ------------------------------------------------------------------------ */
/* Theme                                                                     */
/* ------------------------------------------------------------------------ */

type MermaidTheme = {
  dark: boolean;
  fontFamily: string;
  variables: Record<string, string | boolean>;
};

function toHex(color: string): string | null {
  const match = color.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i,
  );
  if (!match) return /^#[0-9a-f]{6}$/i.test(color) ? color : null;
  return `#${match
    .slice(1, 4)
    .map((n) =>
      Math.max(0, Math.min(255, Math.round(Number(n))))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function mix(a: string, b: string, weightA: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa
    .map((v, i) =>
      Math.round(v * weightA + pb[i] * (1 - weightA))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const FALLBACK_THEME_KEY = "fallback";
let cachedThemeKey: string | null = null;

function computeThemeKey(): string {
  if (typeof document === "undefined") return FALLBACK_THEME_KEY;
  try {
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;";
    document.body.appendChild(probe);
    const read = (cssVar: string, fallback: string) => {
      probe.style.color = fallback;
      probe.style.color = `var(${cssVar}, ${fallback})`;
      return toHex(getComputedStyle(probe).color) || fallback;
    };
    const colors = {
      bg: read("--ds-background-elevated", "#ffffff"),
      text: read("--ds-gray-1000", "#111111"),
      muted: read("--ds-gray-700", "#6b7280"),
      accent: read("--ds-focus-color", "#6d5bd0"),
      green: read("--ds-status-green", "#16a34a"),
      orange: read("--ds-status-orange", "#ea580c"),
    };
    probe.remove();
    const scheme = document.documentElement.getAttribute("data-theme-scheme");
    const dark =
      scheme === "dark" ||
      (scheme !== "light" && luminance(colors.bg) < 0.45);
    const fontFamily =
      getComputedStyle(document.body).fontFamily ||
      "ui-sans-serif, system-ui, sans-serif";
    return JSON.stringify({ dark, fontFamily, ...colors });
  } catch {
    return FALLBACK_THEME_KEY;
  }
}

function themeFromKey(key: string): MermaidTheme {
  let parsed: Record<string, string | boolean> | null = null;
  try {
    parsed = key === FALLBACK_THEME_KEY ? null : JSON.parse(key);
  } catch {
    parsed = null;
  }
  const dark = Boolean(parsed?.dark);
  const bg = String(parsed?.bg || (dark ? "#161821" : "#ffffff"));
  const text = String(parsed?.text || (dark ? "#f3f4f8" : "#111111"));
  const muted = String(parsed?.muted || (dark ? "#8b90a4" : "#6b7280"));
  const accent = String(parsed?.accent || "#6d5bd0");
  const green = String(parsed?.green || "#16a34a");
  const orange = String(parsed?.orange || "#ea580c");
  const fontFamily = String(
    parsed?.fontFamily || "ui-sans-serif, system-ui, sans-serif",
  );
  const node = mix(accent, bg, 0.2);
  return {
    dark,
    fontFamily,
    variables: {
      darkMode: dark,
      background: bg,
      fontFamily,
      fontSize: "13px",
      primaryColor: node,
      primaryTextColor: text,
      primaryBorderColor: accent,
      secondaryColor: mix(green, bg, 0.2),
      secondaryTextColor: text,
      secondaryBorderColor: green,
      tertiaryColor: mix(text, bg, 0.06),
      tertiaryTextColor: text,
      tertiaryBorderColor: mix(text, bg, 0.25),
      mainBkg: node,
      nodeBorder: accent,
      nodeTextColor: text,
      textColor: text,
      titleColor: text,
      lineColor: muted,
      edgeLabelBackground: bg,
      clusterBkg: mix(text, bg, 0.05),
      clusterBorder: mix(text, bg, 0.25),
      noteBkgColor: mix(orange, bg, 0.16),
      noteTextColor: text,
      noteBorderColor: orange,
      actorBkg: node,
      actorBorder: accent,
      actorTextColor: text,
      signalColor: text,
      signalTextColor: text,
      labelTextColor: text,
      pieTitleTextColor: text,
      pieSectionTextColor: text,
      pieLegendTextColor: text,
      pieStrokeColor: bg,
      pieOuterStrokeColor: bg,
    },
  };
}

// One shared observer for every diagram on the page.
const themeListeners = new Set<() => void>();
let stopThemeObserver: (() => void) | null = null;

function startThemeObserver() {
  let frame = 0;
  const update = () => {
    if (frame) return;
    // Coalesce bursts of attribute/style writes from theme switches.
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const next = computeThemeKey();
      if (next === cachedThemeKey) return;
      cachedThemeKey = next;
      themeListeners.forEach((listener) => listener());
    });
  };
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style", "data-theme", "data-theme-scheme"],
  });
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  media?.addEventListener?.("change", update);
  return () => {
    observer.disconnect();
    media?.removeEventListener?.("change", update);
    if (frame) window.cancelAnimationFrame(frame);
  };
}

function subscribeTheme(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  themeListeners.add(onChange);
  if (!stopThemeObserver) stopThemeObserver = startThemeObserver();
  return () => {
    themeListeners.delete(onChange);
    if (!themeListeners.size && stopThemeObserver) {
      stopThemeObserver();
      stopThemeObserver = null;
    }
  };
}

function getThemeSnapshot(): string {
  // Without a live observer the cache may be stale (theme changed while no
  // diagram was mounted) — recompute; equal strings keep the snapshot stable.
  if (cachedThemeKey === null || !stopThemeObserver) {
    cachedThemeKey = computeThemeKey();
  }
  return cachedThemeKey;
}

function getServerThemeSnapshot(): string {
  return FALLBACK_THEME_KEY;
}

function useMermaidThemeKey(): string {
  return useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
}

/* ------------------------------------------------------------------------ */
/* Components                                                                */
/* ------------------------------------------------------------------------ */

const RENDER_DEBOUNCE_MS = 250;
const RENDER_TIMEOUT_MS = 20_000;

type RenderResult = { key: string; svg?: string; error?: string };

function naturalWidthOf(svg: string): number | null {
  const match = svg.match(/max-width:\s*([\d.]+)px/);
  const value = match ? Number(match[1]) : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
}

export const MermaidDiagram = memo(function MermaidDiagram({
  chart,
}: {
  chart: string;
}) {
  const source = useMemo(() => sanitizeMermaidSource(chart), [chart]);
  const themeKey = useMermaidThemeKey();
  const cacheKey = `${themeKey}\u0000${source}`;
  const [result, setResult] = useState<RenderResult | null>(() => {
    const svg = svgCache.get(cacheKey);
    if (svg) return { key: cacheKey, svg };
    const error = errorCache.get(source);
    return error ? { key: cacheKey, error } : null;
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!source) return;
    const cachedSvg = svgCache.get(cacheKey);
    if (cachedSvg) {
      setResult({ key: cacheKey, svg: cachedSvg });
      return;
    }
    const cachedError = errorCache.get(source);
    if (cachedError) {
      setResult({ key: cacheKey, error: cachedError });
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      withTimeout(renderMermaidSvg(source, themeFromKey(themeKey)), RENDER_TIMEOUT_MS)
        .then((svg) => {
          remember(svgCache, cacheKey, svg);
          if (!cancelled) setResult({ key: cacheKey, svg });
        })
        .catch((error: unknown) => {
          const message = describeError(error);
          // Only syntax/render failures are permanent; a failed chunk load or
          // timeout may succeed next time the message mounts.
          if (
            !/dynamically imported|loading chunk|failed to fetch|took too long/i.test(
              message,
            )
          ) {
            remember(errorCache, source, message);
          }
          removeMermaidLeftovers();
          if (!cancelled) setResult({ key: cacheKey, error: message });
        });
    }, RENDER_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cacheKey, source, themeKey]);

  if (!source) return null;

  const current = result?.key === cacheKey ? result : null;

  if (current?.error) {
    return <MermaidErrorNotice source={source} message={current.error} />;
  }

  // While re-rendering for a new theme keep showing the previous drawing.
  const svg = current?.svg || result?.svg;
  if (!svg) {
    return <MermaidPending source={source} label="Drawing diagram…" />;
  }

  const naturalWidth = naturalWidthOf(svg);
  const canExpand = Boolean(naturalWidth && naturalWidth > 420);

  return (
    <figure className="my-3 min-w-0 max-w-full overflow-hidden rounded-[14px] bg-[var(--ds-background-elevated)]">
      <div
        className="overflow-x-auto overscroll-x-contain p-3"
        role="img"
        aria-label="Diagram"
      >
        <div
          style={
            expanded && naturalWidth
              ? { width: naturalWidth, maxWidth: "none" }
              : undefined
          }
          className={cn(
            "mx-auto [&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto",
            expanded
              ? "[&_svg]:w-full! [&_svg]:max-w-none!"
              : "w-full [&_svg]:max-w-full",
          )}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      {canExpand ? (
        <div className="flex justify-end px-2 pb-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] ds-focus"
          >
            {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            {expanded ? "Fit to width" : "Full size"}
          </button>
        </div>
      ) : null}
    </figure>
  );
});

/** Raw-source placeholder for diagrams that are still streaming / drawing. */
export function MermaidPending({
  source,
  label = "Drawing diagram…",
}: {
  source: string;
  label?: string;
}) {
  return (
    <div
      className="my-3 min-w-0 max-w-full rounded-[12px] bg-[var(--ds-background-elevated)] p-3"
      aria-busy
    >
      <p className="mb-2 text-[11px] font-medium text-[var(--ds-gray-700)]">
        {label}
      </p>
      {source.trim() ? (
        <pre className="max-h-48 overflow-auto whitespace-pre text-[11px] leading-5 text-[var(--ds-gray-900)]">
          <code className="bg-transparent! p-0! font-mono">{source}</code>
        </pre>
      ) : null}
    </div>
  );
}

export function MermaidErrorNotice({
  source,
  message,
}: {
  source: string;
  message?: string;
}) {
  return (
    <div className="my-3 min-w-0 max-w-full rounded-[12px] border border-[color:color-mix(in_srgb,var(--ds-status-orange)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-status-orange)_6%,var(--ds-background-elevated))] px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--ds-gray-1000)]">
        <TriangleAlert
          size={13}
          className="shrink-0 text-[var(--ds-status-orange)]"
        />
        Diagram couldn’t be rendered
      </p>
      <details className="group mt-1">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] text-[var(--ds-gray-700)] [&::-webkit-details-marker]:hidden">
          <ChevronRight
            size={12}
            className="transition-transform group-open:rotate-90"
          />
          Show diagram source
        </summary>
        {message ? (
          <p className="mt-1 break-words text-[11px] text-[var(--ds-gray-700)]">
            {message}
          </p>
        ) : null}
        <pre className="mt-1 max-h-64 overflow-auto whitespace-pre text-[11px] leading-5 text-[var(--ds-gray-900)]">
          <code className="bg-transparent! p-0! font-mono">{source}</code>
        </pre>
      </details>
    </div>
  );
}
