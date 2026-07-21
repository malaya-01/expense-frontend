"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MODULE_ROUTES: Record<string, string> = {
  "/accounts": "Accounts",
  "/expenses": "Transactions",
  "/budgets": "Budgets",
  "/goals": "Goals",
  "/investments": "Investments",
  "/reports": "Reports",
  "/settings": "Settings",
};

export function MarkdownRenderer({ content }: { content: string }) {
  const endUserContent = content.replace(
    /`(\/(?:accounts|expenses|budgets|goals|investments|reports|settings))`/g,
    (_match, route: string) => `[${MODULE_ROUTES[route]}](${route})`,
  );

  return (
    <div className="ai-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <Link
              href={href || "#"}
              target={href?.startsWith("/") ? undefined : "_blank"}
              rel="noreferrer"
              className="text-[var(--ds-focus-color)] underline underline-offset-2"
            >
              {children}
            </Link>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-[12px] ds-border">
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
            <td className="border-t border-[var(--ds-gray-200)] px-3 py-2">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 rounded-r-[12px] border-l-2 border-[var(--ds-focus-color)] bg-[color-mix(in_srgb,var(--ds-focus-color)_7%,transparent)] px-4 py-3 text-[var(--ds-gray-900)]">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => (
            <code
              className={
                className
                  ? `${className} block overflow-x-auto rounded-[10px] bg-[var(--ds-background-100)] p-3 text-xs`
                  : "rounded bg-[var(--ds-background-100)] px-1.5 py-0.5 text-[0.9em]"
              }
            >
              {children}
            </code>
          ),
        }}
      >
        {endUserContent}
      </ReactMarkdown>
    </div>
  );
}
