"use client";

import { memo, useRef, type FormEvent, type RefObject } from "react";
import {
  Mic,
  Send,
  Square,
  Target,
  Wallet,
  FileSearch,
  FileText,
  Globe2,
  Paperclip,
  PieChart,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover } from "@/components/ui/popover";
import { MessageBubble, TypingIndicator } from "@/components/ai/message-bubble";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";
import type {
  AiActionProposal,
  AiAttachment,
  AiMessage,
} from "@/types";

const SUGGESTION_CARDS = [
  {
    id: "spending",
    title: "Analyze Spending",
    description: "Find leaks and unusual expenses",
    icon: PieChart,
    prompt: "Analyze my spending this month and highlight unusual expenses.",
  },
  {
    id: "budget",
    title: "Build Budget",
    description: "Propose a monthly plan",
    icon: Wallet,
    prompt: "Build a practical monthly budget I can confirm.",
  },
  {
    id: "goal",
    title: "Set a Goal",
    description: "Create a savings target",
    icon: Target,
    prompt: "Help me set a realistic savings goal for the next 90 days.",
  },
  {
    id: "document",
    title: "Analyze Document",
    description: "Extract insights from a file",
    icon: FileSearch,
    prompt: "I'll attach a document. Analyze it for financial insights.",
  },
] as const;

const DEFAULT_PROMPTS = [
  "Summarize my finances",
  "Find unusual expenses",
  "Create budget",
  "Analyze my statement",
];

export const ChatWorkspace = memo(function ChatWorkspace({
  messages,
  proposals,
  starters,
  draft,
  attachments,
  loading,
  streamingId,
  status,
  dragActive,
  listening,
  voiceSupported,
  webSearchEnabled,
  busyProposal,
  messageEndRef,
  onDraftChange,
  onSend,
  onStop,
  onConfirm,
  onReject,
  onAddFiles,
  onRemoveAttachment,
  onDragState,
  onToggleVoice,
  onToggleWebSearch,
}: {
  messages: AiMessage[];
  proposals: AiActionProposal[];
  starters: string[];
  draft: string;
  attachments: AiAttachment[];
  loading: boolean;
  streamingId: string | null;
  status: string;
  dragActive: boolean;
  listening: boolean;
  voiceSupported: boolean;
  webSearchEnabled: boolean;
  busyProposal: string | null;
  messageEndRef: RefObject<HTMLDivElement | null>;
  onDraftChange: (value: string) => void;
  onSend: (e?: FormEvent, content?: string) => void;
  onStop: () => void;
  onConfirm: (p: AiActionProposal) => void;
  onReject: (id: string) => void;
  onAddFiles: (files: FileList | null) => void;
  onRemoveAttachment: (index: number) => void;
  onDragState: (active: boolean) => void;
  onToggleVoice: () => void;
  onToggleWebSearch: () => void;
}) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.full_name?.trim().split(/\s+/)[0];
  const hasConversation = messages.length > 0;
  const promptChips = (starters.length ? starters : DEFAULT_PROMPTS).slice(0, 4);

  return (
    <section
      className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--ds-background-100)]"
      aria-label="Conversation"
    >
      <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
        <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col">
          {!hasConversation ? (
            <div className="my-auto shrink-0 pb-8 pt-4">
              <h1 className="text-[1.75rem] font-semibold tracking-[-0.04em] text-[var(--ds-gray-1000)] sm:text-[2rem]">
                {greeting}
                {firstName ? `, ${firstName}` : ""}{" "}
                <span aria-hidden>👋</span>
              </h1>
              <p className="mt-2 text-sm text-[var(--ds-gray-700)]">
                How can I help with your finances today?
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {SUGGESTION_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      disabled={loading}
                      onClick={() => onSend(undefined, card.prompt)}
                      className="flex max-h-[90px] min-h-[72px] items-center gap-2.5 rounded-[14px] bg-[var(--ds-background-elevated)] px-3 py-2.5 text-left shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.06))] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[var(--ds-gray-100)] disabled:opacity-50 ds-focus motion-reduce:transform-none"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[color-mix(in_srgb,var(--ds-focus-color)_14%,transparent)] text-[var(--ds-focus-color)]">
                        <Icon size={15} aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-[var(--ds-gray-1000)]">
                          {card.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-[var(--ds-gray-700)]">
                          {card.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-6 pt-2">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  streaming={message.id === streamingId}
                  proposals={proposals.filter((p) =>
                    (message.proposal_ids || []).includes(p.id),
                  )}
                  onConfirm={onConfirm}
                  onReject={onReject}
                  busyProposal={busyProposal}
                />
              ))}
              {loading && status ? <TypingIndicator label={status} /> : null}
              {!loading && starters.length ? (
                <section
                  className="ml-11 space-y-1.5 pt-1"
                  aria-label="Related questions"
                >
                  <p className="pb-1 text-xs font-medium text-[var(--ds-gray-700)]">
                    Related questions
                  </p>
                  {starters.slice(0, 4).map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => onSend(undefined, question)}
                      className="flex w-full items-center justify-between gap-3 rounded-[12px] bg-[var(--ds-background-elevated)] px-3 py-2.5 text-left text-xs leading-5 text-[var(--ds-gray-1000)] transition-colors hover:bg-[var(--ds-gray-100)] ds-focus"
                    >
                      <span>{question}</span>
                      <span
                        aria-hidden
                        className="shrink-0 text-[var(--ds-gray-700)]"
                      >
                        →
                      </span>
                    </button>
                  ))}
                </section>
              ) : null}
              <div ref={messageEndRef} aria-hidden />
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 bg-[color-mix(in_srgb,var(--ds-background-100)_92%,transparent)] px-4 pb-4 pt-2 backdrop-blur-md sm:px-8">
        <form
          onSubmit={onSend}
          onDragEnter={(event) => {
            event.preventDefault();
            onDragState(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            onDragState(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              onDragState(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            onDragState(false);
            void onAddFiles(event.dataTransfer.files);
          }}
          className={cn(
            "relative mx-auto w-full max-w-[720px] rounded-[30px] bg-[var(--ds-background-elevated)] p-2 shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.08))] transition-[box-shadow]",
            dragActive &&
              "shadow-[0_0_0_2px_color-mix(in_srgb,var(--ds-focus-color)_35%,transparent)]",
          )}
          aria-label="Message composer"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/csv,application/json"
            className="sr-only"
            disabled={attachments.length >= 3 || loading}
            onChange={(event) => {
              if (event.target.files?.length) {
                void onAddFiles(event.target.files);
              }
              event.target.value = "";
            }}
          />

          {dragActive ? (
            <div className="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-[14px] border border-dashed border-[var(--ds-focus-color)] bg-[var(--ds-background-elevated)]/92">
              <p className="text-xs font-medium">Drop files to attach</p>
            </div>
          ) : null}

          {attachments.length ? (
            <div className="flex flex-wrap gap-2 px-2 pb-1 pt-1.5">
              {attachments.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[var(--ds-background-100)] text-xs shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.08))]"
                  title={file.name}
                >
                  {file.mime_type.startsWith("image/") && file.data_base64 ? (
                    <span
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: `url(data:${file.mime_type};base64,${file.data_base64})`,
                      }}
                      role="img"
                      aria-label={file.name}
                    />
                  ) : (
                    <span className="flex flex-col items-center gap-1 px-1 text-center">
                      <FileText
                        size={20}
                        className="text-[var(--ds-focus-color)]"
                      />
                      <span className="w-12 truncate text-[9px]">{file.name}</span>
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => onRemoveAttachment(index)}
                    className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-[var(--ds-gray-1000)] text-[var(--ds-primary-foreground)] shadow-sm ds-focus"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex min-h-11 items-end gap-1">
            <Popover
              align="start"
              triggerLabel="Add files and more"
              closeOnSelect
              className="w-[min(520px,calc(100vw-24px))] rounded-[20px] p-2"
              trigger={
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)]">
                  <Plus size={21} />
                </span>
              }
            >
              <div className="space-y-1" aria-label="Advisor tools">
                <button
                  type="button"
                  disabled={attachments.length >= 3 || loading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-12 w-full items-center gap-3 rounded-[12px] px-3 text-left hover:bg-[var(--ds-gray-100)] disabled:opacity-50 ds-focus"
                >
                  <Paperclip
                    size={18}
                    className="shrink-0 text-[var(--ds-gray-900)]"
                  />
                  <span className="text-sm font-medium">Add photos & files</span>
                  <span className="text-xs text-[var(--ds-gray-700)]">
                    Upload from computer
                  </span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={onToggleWebSearch}
                  className="flex min-h-12 w-full items-center gap-3 rounded-[12px] px-3 text-left hover:bg-[var(--ds-gray-100)] disabled:opacity-50 ds-focus"
                >
                  <Globe2
                    size={18}
                    className="shrink-0 text-[var(--ds-focus-color)]"
                  />
                  <span className="text-sm font-medium">Web search</span>
                  <span className="text-xs text-[var(--ds-gray-700)]">
                    {webSearchEnabled
                      ? "Enabled for your next message"
                      : "Use current public sources"}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    onSend(
                      undefined,
                      "Analyze my spending and identify unusual transactions.",
                    )
                  }
                  className="flex min-h-12 w-full items-center gap-3 rounded-[12px] px-3 text-left hover:bg-[var(--ds-gray-100)] disabled:opacity-50 ds-focus"
                >
                  <PieChart
                    size={18}
                    className="shrink-0 text-[var(--ds-focus-color)]"
                  />
                  <span className="text-sm font-medium">Analyze spending</span>
                  <span className="text-xs text-[var(--ds-gray-700)]">
                    Find trends and unusual expenses
                  </span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    onSend(
                      undefined,
                      "Give me a detailed financial health report with prioritized next steps.",
                    )
                  }
                  className="flex min-h-12 w-full items-center gap-3 rounded-[12px] px-3 text-left hover:bg-[var(--ds-gray-100)] disabled:opacity-50 ds-focus"
                >
                  <FileSearch
                    size={18}
                    className="shrink-0 text-[var(--ds-focus-color)]"
                  />
                  <span className="text-sm font-medium">Financial deep dive</span>
                  <span className="text-xs text-[var(--ds-gray-700)]">
                    Get a detailed report
                  </span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    onSend(
                      undefined,
                      "Build a practical monthly budget I can review and confirm.",
                    )
                  }
                  className="flex min-h-12 w-full items-center gap-3 rounded-[12px] px-3 text-left hover:bg-[var(--ds-gray-100)] disabled:opacity-50 ds-focus"
                >
                  <Wallet
                    size={18}
                    className="shrink-0 text-[var(--ds-focus-color)]"
                  />
                  <span className="text-sm font-medium">Create budget</span>
                  <span className="text-xs text-[var(--ds-gray-700)]">
                    Build a personalized plan
                  </span>
                </button>
              </div>
            </Popover>

            <Textarea
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void onSend();
                }
              }}
              placeholder="Ask anything"
              rows={1}
              aria-label="Message"
              style={{
                minHeight: 44,
                maxHeight: 280,
                resize: "none",
              }}
              className="min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-3 text-sm shadow-none [field-sizing:content]"
            />

            {webSearchEnabled ? (
              <span className="mb-1.5 hidden shrink-0 items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--ds-focus-color)_12%,transparent)] px-2 py-1 text-[10px] font-medium text-[var(--ds-focus-color)] sm:inline-flex">
                <Globe2 size={11} />
                Web
              </span>
            ) : null}

            {loading ? (
              <button
                type="button"
                onClick={onStop}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-gray-100)] text-[var(--ds-gray-1000)] ds-focus"
                aria-label="Stop response"
              >
                <Square size={14} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onToggleVoice}
                  disabled={!voiceSupported}
                  title={
                    voiceSupported
                      ? listening
                        ? "Stop listening"
                        : "Voice input"
                      : "Voice unavailable in this browser"
                  }
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-full ds-focus",
                    listening
                      ? "bg-[color-mix(in_srgb,var(--ds-focus-color)_16%,transparent)] text-[var(--ds-focus-color)]"
                      : "text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)]",
                    !voiceSupported && "opacity-40",
                  )}
                  aria-label="Voice input"
                  aria-pressed={listening}
                >
                  <Mic size={19} />
                </button>
                <Button
                  type="submit"
                  disabled={!draft.trim() && !attachments.length}
                  className="size-11 shrink-0 rounded-full px-0"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </Button>
              </>
            )}
          </div>
        </form>

        {!hasConversation ? (
          <div
            className="mx-auto mt-2.5 flex w-full max-w-[720px] flex-wrap gap-1.5"
            aria-label="Suggested prompts"
          >
            {promptChips.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={loading}
                onClick={() => onSend(undefined, prompt)}
                className="rounded-full bg-[var(--ds-background-elevated)] px-3 py-1.5 text-[11px] text-[var(--ds-gray-900)] transition-colors hover:bg-[var(--ds-gray-100)] disabled:opacity-50 ds-focus"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
});
