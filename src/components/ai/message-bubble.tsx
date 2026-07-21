"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type {
  AiActionProposal,
  AiCitation,
  AiMessage,
} from "@/types";

export function MessageBubble({
  message,
  proposals,
  onConfirm,
  onReject,
  busyProposal,
  streaming,
}: {
  message: AiMessage;
  proposals: AiActionProposal[];
  onConfirm: (p: AiActionProposal) => void;
  onReject: (id: string) => void;
  busyProposal: string | null;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[92%] rounded-[12px] px-3.5 py-2.5 text-sm leading-5",
          isUser
            ? "bg-[var(--ds-focus-color)] text-white ds-strong-border"
            : "bg-[var(--ds-background-elevated)] text-[var(--ds-gray-1000)] ds-strong-border",
        )}
      >
        {message.attachments?.length ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((file) => (
              <span
                key={`${file.name}-${file.mime_type}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-1 text-[11px] ds-border",
                  isUser
                    ? "bg-white/15 text-white"
                    : "bg-[var(--ds-background-100)] text-[var(--ds-gray-900)]",
                )}
              >
                <span aria-hidden>↗</span>
                {file.name}
              </span>
            ))}
          </div>
        ) : null}

        <div className="ai-markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => (
                <a
                  href={href}
                  target={href?.startsWith("/") ? undefined : "_blank"}
                  rel="noreferrer"
                  className="text-[var(--ds-focus-color)] underline underline-offset-2"
                >
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
          {streaming ? (
            <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-[var(--ds-gray-700)] align-middle" />
          ) : null}
        </div>

        {!isUser && message.citations?.length ? (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_12%,transparent)] pt-3">
            {(message.citations as AiCitation[]).map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="rounded-full bg-[var(--ds-background-elevated)] px-2 py-0.5 text-[11px] text-[var(--ds-focus-color)] ds-border"
              >
                {c.label}
              </Link>
            ))}
          </div>
        ) : null}

        {!isUser &&
          proposals.map((p) => (
            <div
              key={p.id}
              className="mt-3 rounded-[8px] bg-[var(--ds-background-elevated)] p-2.5 ds-border"
            >
              <p className="text-xs font-medium">{p.title}</p>
              {p.status === "pending" ? (
                <div className="mt-2 flex gap-1">
                  <Button size="sm" onClick={() => onConfirm(p)}>
                    Review
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busyProposal === p.id}
                    onClick={() => onReject(p.id)}
                  >
                    Reject
                  </Button>
                </div>
              ) : (
                <p className="mt-1 text-[11px] capitalize text-[var(--ds-gray-700)]">
                  {p.status}
                </p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
