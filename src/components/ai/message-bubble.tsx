"use client";

import { memo } from "react";
import {
  CircleAlert,
  Copy,
  ExternalLink,
  Globe2,
  RefreshCw,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ai/markdown-renderer";
import { cn } from "@/lib/cn";
import type { AiActionProposal, AiCitation, AiMessage } from "@/types";

export const AssistantMessage = memo(function AssistantMessage({
  message,
  proposals,
  onConfirm,
  onReject,
  onReviewBatch,
  busyProposal,
  streaming,
}: {
  message: AiMessage;
  proposals: AiActionProposal[];
  onConfirm: (p: AiActionProposal) => void;
  onReject: (id: string) => void;
  onReviewBatch?: (ids: string[]) => void;
  busyProposal: string | null;
  streaming?: boolean;
}) {
  const hasContent = Boolean(message.content?.trim());
  const citations = (message.citations || []) as AiCitation[];
  const webSources = citations.filter(
    (citation) =>
      citation.source_type === "web" || /^https?:\/\//i.test(citation.href),
  );
  const referenceImages = [
    ...new Map(
      webSources
        .filter((source) => source.image_url)
        .map((source) => [source.image_url, source]),
    ).values(),
  ].slice(0, 4);

  return (
    <div className="flex gap-3 [content-visibility:auto]">
      <Avatar name="FinOS Advisor" className="mt-0.5 shrink-0" />
      <div className="min-w-0 max-w-[min(680px,92%)] flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <p className="text-xs font-semibold text-[var(--ds-gray-1000)]">
            FinOS Advisor
          </p>
          <time className="text-[10px] text-[var(--ds-gray-700)]">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>

        <div className="text-sm leading-6 text-[var(--ds-gray-1000)]">
          {message.attachments?.length ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {message.attachments.map((file) => (
                <span
                  key={`${file.name}-${file.mime_type}`}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--ds-background-elevated)] px-2.5 py-1 text-[11px] shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.06))]"
                >
                  {file.name}
                </span>
              ))}
            </div>
          ) : null}

          {referenceImages.length ? (
            <div
              className="mb-4 grid grid-cols-2 gap-2"
              aria-label="Reference images"
            >
              {referenceImages.map((source, index) => (
                <a
                  key={source.image_url}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "group relative overflow-hidden rounded-[14px] bg-[var(--ds-background-elevated)] ds-focus",
                    referenceImages.length === 1 && "col-span-2",
                    index > 1 && "hidden sm:block",
                  )}
                >
                  <img
                    src={source.image_url}
                    alt={`Reference from ${source.label}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="aspect-[16/8] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none"
                  />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-[10px] text-white">
                    <span className="truncate">
                      {source.domain || source.label}
                    </span>
                    <ExternalLink size={11} className="shrink-0" />
                  </span>
                </a>
              ))}
            </div>
          ) : null}

          <div aria-live={streaming ? "polite" : undefined}>
            {hasContent || streaming ? (
              <MarkdownRenderer
                content={message.content || (streaming ? " " : "")}
                streaming={streaming}
              />
            ) : null}
          </div>

          {webSources.length ? (
            <section className="mt-4">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-[var(--ds-gray-700)]">
                <Globe2 size={12} />
                Sources
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {webSources.map((source, index) => (
                  <a
                    key={source.href}
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group min-w-0 rounded-[12px] bg-[var(--ds-background-elevated)] p-3 shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.06))] transition-colors hover:bg-[var(--ds-gray-100)] ds-focus"
                  >
                    <span className="flex items-start gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--ds-background-100)] text-[10px] font-medium text-[var(--ds-gray-900)]">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 block text-[11px] font-medium leading-4">
                          {source.label}
                        </span>
                        <span className="mt-1 block truncate text-[10px] text-[var(--ds-gray-700)]">
                          {source.domain || source.href}
                        </span>
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          {proposals.length ? (
            <div className="mt-3 space-y-2">
              {proposals.filter((p) => p.status === "pending").length > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[var(--ds-background-elevated)] px-3 py-2 shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.06))]">
                  <p className="text-[11px] text-[var(--ds-gray-800)]">
                    {proposals.filter((p) => p.status === "pending").length}{" "}
                    pending actions
                  </p>
                  <Button
                    size="sm"
                    onClick={() =>
                      onReviewBatch?.(
                        proposals
                          .filter((p) => p.status === "pending")
                          .map((p) => p.id),
                      )
                    }
                  >
                    Review all
                  </Button>
                </div>
              ) : null}
              {proposals.map((p) => (
            <div
              key={p.id}
              className="rounded-[14px] bg-[var(--ds-background-elevated)] p-3 shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.06))]"
            >
              <p className="text-xs font-medium">{p.title}</p>
              {p.summary ? (
                <p className="mt-1 text-[11px] text-[var(--ds-gray-700)]">
                  {p.summary}
                </p>
              ) : null}
              {p.status === "pending" ? (
                <div className="mt-2 flex gap-1.5">
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
          ) : null}
        </div>

        {!streaming && hasContent ? (
          <div className="mt-1.5 flex gap-1 text-[var(--ds-gray-700)]">
            <button
              type="button"
              className="rounded-[7px] p-1.5 hover:bg-[var(--ds-gray-100)] ds-focus"
              aria-label="Copy message"
              onClick={() => void navigator.clipboard.writeText(message.content)}
            >
              <Copy size={13} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
});

export const UserMessage = memo(function UserMessage({
  message,
}: {
  message: AiMessage;
}) {
  return (
    <div className="flex justify-end gap-3 [content-visibility:auto]">
      <div className="max-w-[min(560px,85%)]">
        <div className="rounded-[18px] rounded-br-[6px] bg-[var(--ds-focus-color)] px-4 py-2.5 text-sm leading-6 text-white shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.12))]">
          {message.attachments?.length ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {message.attachments.map((file) => (
                <span
                  key={`${file.name}-${file.mime_type}`}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-white/15 px-2.5 py-1 text-[11px]"
                >
                  {file.name}
                </span>
              ))}
            </div>
          ) : null}
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <time className="mt-1 block text-right text-[10px] text-[var(--ds-gray-700)]">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
    </div>
  );
});

export const MessageBubble = memo(function MessageBubble({
  message,
  proposals,
  onConfirm,
  onReject,
  onReviewBatch,
  busyProposal,
  streaming,
}: {
  message: AiMessage;
  proposals: AiActionProposal[];
  onConfirm: (p: AiActionProposal) => void;
  onReject: (id: string) => void;
  onReviewBatch?: (ids: string[]) => void;
  busyProposal: string | null;
  streaming?: boolean;
}) {
  if (message.role === "user") {
    return <UserMessage message={message} />;
  }
  if (message.role === "system" || message.role === "tool") {
    return null;
  }
  return (
    <AssistantMessage
      message={message}
      proposals={proposals}
      onConfirm={onConfirm}
      onReject={onReject}
      onReviewBatch={onReviewBatch}
      busyProposal={busyProposal}
      streaming={streaming}
    />
  );
});

export function TypingIndicator({ label }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-2.5 pl-11 text-xs text-[var(--ds-gray-700)]"
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex gap-1" aria-hidden>
        <span className="size-1.5 animate-pulse rounded-full bg-[var(--ds-gray-700)] motion-reduce:animate-none" />
        <span className="size-1.5 animate-pulse rounded-full bg-[var(--ds-gray-700)] [animation-delay:120ms] motion-reduce:animate-none" />
        <span className="size-1.5 animate-pulse rounded-full bg-[var(--ds-gray-700)] [animation-delay:240ms] motion-reduce:animate-none" />
      </span>
      {label || "Thinking…"}
    </div>
  );
}

export function EmptyChatStateNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[14px] bg-[var(--ds-background-elevated)] px-4 py-3 text-sm shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.06))]">
      <div className="flex items-start gap-2">
        <CircleAlert
          size={16}
          className="mt-0.5 text-[var(--ds-status-orange)]"
        />
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-xs text-[var(--ds-gray-700)]">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function RefreshChip({
  loading,
  onClick,
}: {
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-[8px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] ds-focus"
      aria-label="Refresh"
    >
      <RefreshCw size={14} className={cn(loading && "animate-spin")} />
    </button>
  );
}
