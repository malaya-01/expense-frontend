"use client";

import {
  memo,
  useDeferredValue,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MermaidDiagram,
  MermaidErrorNotice,
  MermaidPending,
} from "@/components/ai/mermaid-diagram";
import { RenderBoundary } from "@/components/ai/render-boundary";
import { sanitizeAiChatContent } from "@/lib/ai/sanitize-chat-content";
import {
  MERMAID_PENDING_LANG,
  prepareStreamingMarkdown,
} from "@/lib/ai/streaming-markdown";
import { cn } from "@/lib/cn";

const MODULE_ROUTES: Record<string, string> = {
  "/accounts": "Accounts",
  "/expenses": "Transactions",
  "/budgets": "Budgets",
  "/goals": "Goals",
  "/investments": "Investments",
  "/loans": "Loans",
  "/recurring": "Recurring",
  "/reports": "Reports",
  "/settings": "Settings",
  "/categories": "Categories",
  "/ai": "AI Advisor",
};

function CodeBlock({
  language,
  children,
}: {
  language?: string;
  children: string;
}) {
  const [copied, setCopied] = useState(false);
  const lang = (language || "text").replace(/^language-/, "");

  return (
    <div className="group my-3 min-w-0 max-w-full overflow-hidden rounded-[14px] bg-[var(--ds-background-100)] shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.06))]">
      <div className="flex items-center justify-between gap-2 border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] px-3 py-1.5">
        <span className="min-w-0 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ds-gray-700)]">
          {lang}
        </span>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-[var(--ds-gray-700)] opacity-70 transition-opacity hover:bg-[var(--ds-gray-100)] hover:opacity-100 ds-focus"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(children);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            } catch {
              /* ignore */
            }
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="m-0 max-w-full overflow-x-auto overscroll-x-contain rounded-none bg-transparent p-3 text-[12px] leading-5">
        <code className="whitespace-pre bg-transparent p-0 font-mono text-[var(--ds-gray-1000)]">
          {children}
        </code>
      </pre>
    </div>
  );
}

function Callout({
  tone,
  children,
}: {
  tone: "note" | "tip" | "warning" | "important";
  children: ReactNode;
}) {
  const styles = {
    note: "border-[var(--ds-status-blue)] bg-[color-mix(in_srgb,var(--ds-status-blue)_8%,transparent)]",
    tip: "border-[var(--ds-status-green)] bg-[color-mix(in_srgb,var(--ds-status-green)_8%,transparent)]",
    warning:
      "border-[var(--ds-status-orange)] bg-[color-mix(in_srgb,var(--ds-status-orange)_10%,transparent)]",
    important:
      "border-[var(--ds-status-red)] bg-[color-mix(in_srgb,var(--ds-status-red)_8%,transparent)]",
  } as const;

  return (
    <aside
      className={cn(
        "my-3 rounded-r-[12px] border-l-2 px-4 py-3 text-sm text-[var(--ds-gray-900)]",
        styles[tone],
      )}
    >
      {children}
    </aside>
  );
}

function detectCallout(
  children: ReactNode,
): { tone: "note" | "tip" | "warning" | "important"; rest: ReactNode } | null {
  const text = flattenText(children).trim();
  const match = text.match(/^(note|tip|warning|important)\s*[:—-]\s*/i);
  if (!match) return null;
  const tone = match[1].toLowerCase() as
    | "note"
    | "tip"
    | "warning"
    | "important";
  return { tone, rest: children };
}

function flattenText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return flattenText(props?.children);
  }
  return "";
}

function DiagramBlock({ source }: { source: string }) {
  return (
    <RenderBoundary
      label="diagram"
      resetKey={source}
      fallback={() => <MermaidErrorNotice source={source} />}
    >
      <MermaidDiagram chart={source} />
    </RenderBoundary>
  );
}

/**
 * Module-level (stable) component map. Inline component functions would get a
 * new identity on every streamed token, remounting every block — diagrams
 * would re-render (and re-fail) per token.
 */
const MARKDOWN_COMPONENTS: Components = {
  a: ({ href, children }) => {
    const target = href || "#";
    const internal = target.startsWith("/") || target.startsWith("#");
    return internal ? (
      <Link href={target} className="ai-md-link break-words">
        {children}
      </Link>
    ) : (
      <a
        href={target}
        target="_blank"
        rel="noreferrer noopener"
        className="ai-md-link [overflow-wrap:anywhere]"
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => <strong className="ai-md-strong">{children}</strong>,
  em: ({ children }) => <em className="ai-md-em">{children}</em>,
  p: ({ children }) => <p className="ai-md-p">{children}</p>,
  h1: ({ children }) => (
    <h2 className="text-base font-semibold tracking-[-0.02em] text-[var(--ds-gray-1000)]">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="text-sm font-semibold tracking-[-0.02em] text-[var(--ds-gray-1000)]">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="text-sm font-medium text-[var(--ds-gray-1000)]">
      {children}
    </h4>
  ),
  hr: () => (
    <hr className="my-4 border-0 border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_12%,transparent)]" />
  ),
  img: ({ src, alt }) =>
    typeof src === "string" && src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt || ""}
        loading="lazy"
        className="my-3 h-auto max-h-80 max-w-full rounded-[14px] object-contain"
      />
    ) : null,
  table: ({ children }) => (
    <div className="my-3 max-w-full overflow-x-auto overscroll-x-contain rounded-[12px] border border-[color:color-mix(in_srgb,var(--ds-gray-1000)_10%,transparent)]">
      <table className="min-w-full border-collapse text-left text-xs">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="whitespace-nowrap bg-[var(--ds-background-100)] px-3 py-2 font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="min-w-[5rem] max-w-[22rem] border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] px-3 py-2 align-top [overflow-wrap:break-word]">
      {children}
    </td>
  ),
  blockquote: ({ children }) => {
    const callout = detectCallout(children);
    if (callout) {
      return <Callout tone={callout.tone}>{callout.rest}</Callout>;
    }
    return (
      <blockquote className="my-3 rounded-r-[12px] border-l-2 border-[var(--ds-status-blue)] bg-[color-mix(in_srgb,var(--ds-status-blue)_7%,transparent)] px-4 py-3 text-[var(--ds-gray-900)]">
        {children}
      </blockquote>
    );
  },
  pre: ({ children }) => <>{children}</>,
  code: ({ children, className }) => {
    const text = String(children ?? "").replace(/\n$/, "");
    const language = /language-([^\s]+)/.exec(className || "")?.[1];
    const isBlock = Boolean(className) || text.includes("\n");

    if (!isBlock) {
      return (
        <code className="rounded bg-[var(--ds-background-100)] px-1.5 py-0.5 font-mono text-[0.9em] text-[var(--ds-gray-1000)] [overflow-wrap:anywhere]">
          {children}
        </code>
      );
    }

    if (language === MERMAID_PENDING_LANG) {
      return <MermaidPending source={text} />;
    }

    if (language === "mermaid") {
      return <DiagramBlock source={text} />;
    }

    return <CodeBlock language={language}>{text}</CodeBlock>;
  },
};

const REMARK_PLUGINS = [remarkGfm];

function prepareContent(content: string, streaming: boolean): string {
  return prepareStreamingMarkdown(
    sanitizeAiChatContent(content).replace(
      /`(\/(?:accounts|expenses|budgets|goals|investments|loans|recurring|reports|settings|categories|ai))`/g,
      (_match, route: string) => `[${MODULE_ROUTES[route]}](${route})`,
    ),
    streaming,
  );
}

function PlainTextFallback({ content }: { content: string }) {
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--ds-gray-1000)] [overflow-wrap:anywhere]">
      {content}
    </div>
  );
}

const MarkdownBody = memo(function MarkdownBody({
  content,
  streaming,
}: {
  content: string;
  streaming: boolean;
}) {
  const prepared = useMemo(
    () => prepareContent(content, streaming),
    [content, streaming],
  );
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      components={MARKDOWN_COMPONENTS}
    >
      {prepared}
    </ReactMarkdown>
  );
});

export function MarkdownRenderer({
  content,
  streaming = false,
}: {
  content: string;
  streaming?: boolean;
}) {
  // While streaming, let React skip intermediate token states under load so
  // markdown parsing never blocks input / the stream on slow phones.
  const deferredContent = useDeferredValue(content);
  const visibleContent = streaming ? deferredContent : content;

  return (
    <div
      className={cn(
        "ai-markdown min-w-0 max-w-full break-words",
        streaming && "is-streaming",
      )}
    >
      <RenderBoundary
        label="message markdown"
        resetKey={`${streaming ? "s" : "f"}:${visibleContent.length}`}
        fallback={() => <PlainTextFallback content={content} />}
      >
        <MarkdownBody content={visibleContent} streaming={streaming} />
      </RenderBoundary>
    </div>
  );
}
