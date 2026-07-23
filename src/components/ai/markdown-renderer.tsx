"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "@/components/ai/mermaid-diagram";
import { sanitizeAiChatContent } from "@/lib/ai/sanitize-chat-content";
import { prepareStreamingMarkdown } from "@/lib/ai/streaming-markdown";
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
    <div className="group my-3 overflow-hidden rounded-[14px] bg-[var(--ds-background-100)] shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.06))]">
      <div className="flex items-center justify-between gap-2 border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ds-gray-700)]">
          {lang}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-[var(--ds-gray-700)] opacity-70 transition-opacity hover:bg-[var(--ds-gray-100)] hover:opacity-100 ds-focus"
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
      <pre className="overflow-x-auto p-3 text-[12px] leading-5">
        <code className="font-mono text-[var(--ds-gray-1000)]">{children}</code>
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

export function MarkdownRenderer({
  content,
  streaming = false,
}: {
  content: string;
  streaming?: boolean;
}) {
  const endUserContent = prepareStreamingMarkdown(
    sanitizeAiChatContent(content).replace(
      /`(\/(?:accounts|expenses|budgets|goals|investments|loans|recurring|reports|settings|categories|ai))`/g,
      (_match, route: string) => `[${MODULE_ROUTES[route]}](${route})`,
    ),
    streaming,
  );

  return (
    <div className={cn("ai-markdown", streaming && "is-streaming")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <Link
              href={href || "#"}
              target={href?.startsWith("/") ? undefined : "_blank"}
              rel="noreferrer"
              className="ai-md-link"
            >
              {children}
            </Link>
          ),
          strong: ({ children }) => (
            <strong className="ai-md-strong">{children}</strong>
          ),
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
            src ? (
              <img
                src={src}
                alt={alt || ""}
                loading="lazy"
                className="my-3 max-h-80 w-full rounded-[14px] object-cover"
              />
            ) : null,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-[12px] border border-[color:color-mix(in_srgb,var(--ds-gray-1000)_10%,transparent)]">
              <table className="w-full border-collapse text-left text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-[var(--ds-background-100)] px-3 py-2 font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] px-3 py-2 align-top">
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
            const text = String(children).replace(/\n$/, "");
            const language = /language-([^\s]+)/.exec(className || "")?.[1];
            const isBlock = Boolean(className) || text.includes("\n");

            if (!isBlock) {
              return (
                <code className="rounded bg-[var(--ds-background-100)] px-1.5 py-0.5 font-mono text-[0.9em] text-[var(--ds-gray-1000)]">
                  {children}
                </code>
              );
            }

            if (language === "mermaid") {
              return <MermaidDiagram chart={text} />;
            }

            return <CodeBlock language={language}>{text}</CodeBlock>;
          },
        }}
      >
        {endUserContent}
      </ReactMarkdown>
    </div>
  );
}
