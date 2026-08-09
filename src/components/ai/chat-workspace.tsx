"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type RefObject,
  type UIEvent,
} from "react";
import {
  ArrowDown,
  Mic,
  Send,
  Square,
  FileText,
  Globe2,
  Paperclip,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover } from "@/components/ui/popover";
import { CircularProgress } from "@/components/ui/circular-progress";
import { MessageBubble } from "@/components/ai/message-bubble";
import {
  ChatCommandMenu,
  type CommandMenuState,
} from "@/components/ai/chat-command-menu";
import { useAuth } from "@/lib/auth-context";
import { useModulePermissions } from "@/components/permissions/permission-gate";
import { cn } from "@/lib/cn";
import {
  detectCommandTrigger,
  type AiAtToolDef,
  type AiSlashCommandDef,
} from "@/lib/ai/command-catalog";
import type {
  AiActionProposal,
  AiAttachment,
  AiMessage,
} from "@/types";

const NEAR_BOTTOM_PX = 96;

export const ChatWorkspace = memo(function ChatWorkspace({
  messages,
  proposals,
  draft,
  attachments,
  loading,
  streamingId,
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
  onReviewBatch,
  onAddFiles,
  onRemoveAttachment,
  onDragState,
  onToggleVoice,
  onToggleWebSearch,
}: {
  messages: AiMessage[];
  proposals: AiActionProposal[];
  draft: string;
  attachments: AiAttachment[];
  loading: boolean;
  streamingId: string | null;
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
  onReviewBatch?: (ids: string[]) => void;
  onAddFiles: (files: FileList | File[] | null) => void;
  onRemoveAttachment: (index: number) => void;
  onDragState: (active: boolean) => void;
  onToggleVoice: () => void;
  onToggleWebSearch: () => void;
}) {
  const { user } = useAuth();
  const perms = useModulePermissions("ai");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const prevCountRef = useRef(messages.length);
  const [showJumpBottom, setShowJumpBottom] = useState(false);
  const [menu, setMenu] = useState<CommandMenuState>(null);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.full_name?.trim().split(/\s+/)[0];
  const hasConversation = messages.length > 0;
  const attachmentsBusy = useMemo(
    () =>
      attachments.some(
        (file) =>
          file.upload_status === "uploading" || file.upload_status === "failed",
      ),
    [attachments],
  );
  const canSend =
    perms.create &&
    !loading &&
    !attachmentsBusy &&
    Boolean(draft.trim() || attachments.some((file) => file.upload_status !== "failed"));

  const updateStickState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance <= NEAR_BOTTOM_PX;
    stickToBottomRef.current = nearBottom;
    setShowJumpBottom(!nearBottom && hasConversation);
  }, [hasConversation]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = true;
    setShowJumpBottom(false);
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const onScroll = useCallback(
    (_event: UIEvent<HTMLDivElement>) => {
      updateStickState();
    },
    [updateStickState],
  );

  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streamingId, loading]);

  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = messages.length;
    if (messages.length > prev) {
      const last = messages[messages.length - 1];
      if (last?.role === "user") {
        scrollToBottom("auto");
      }
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    updateStickState();
  }, [messages.length, updateStickState]);

  const refreshMenu = useCallback((value: string, caret: number) => {
    setMenu(detectCommandTrigger(value, caret));
  }, []);

  const replaceRange = useCallback(
    (start: number, end: number, insert: string) => {
      const next = `${draft.slice(0, start)}${insert}${draft.slice(end)}`;
      onDraftChange(next);
      setMenu(null);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        const pos = start + insert.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [draft, onDraftChange],
  );

  const onPickAt = useCallback(
    (tool: AiAtToolDef) => {
      if (!menu) return;
      replaceRange(menu.start, menu.end, `@${tool.id} `);
      if (tool.id === "web" && !webSearchEnabled) onToggleWebSearch();
    },
    [menu, onToggleWebSearch, replaceRange, webSearchEnabled],
  );

  const onPickSlash = useCallback(
    (cmd: AiSlashCommandDef) => {
      if (!menu) return;
      replaceRange(menu.start, menu.end, `${cmd.command} `);
      if (cmd.web_search && !webSearchEnabled) onToggleWebSearch();
    },
    [menu, onToggleWebSearch, replaceRange, webSearchEnabled],
  );

  const onPasteFiles = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const clipboard = event.clipboardData;
      if (!clipboard || attachments.length >= 3 || loading) return;

      // Prefer clipboard.files; fall back to items. Never merge both — browsers
      // often expose the same screenshot in each list (double-paste bug).
      let rawImages: File[] = Array.from(clipboard.files || []).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (!rawImages.length) {
        for (const item of Array.from(clipboard.items || [])) {
          if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
          const file = item.getAsFile();
          if (file) rawImages.push(file);
        }
      }
      if (!rawImages.length) return;

      const stamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const images = rawImages.map((file, index) => {
        const ext =
          file.type === "image/jpeg"
            ? "jpg"
            : file.type === "image/webp"
              ? "webp"
              : file.type === "image/gif"
                ? "gif"
                : "png";
        const needsName =
          !file.name ||
          file.name === "image.png" ||
          file.name === "blob" ||
          file.name === "image";
        if (!needsName) return file;
        const suffix = rawImages.length > 1 ? `-${index + 1}` : "";
        return new File([file], `screenshot-${stamp}${suffix}.${ext}`, {
          type: file.type,
        });
      });

      event.preventDefault();
      void onAddFiles(images);
    },
    [attachments.length, loading, onAddFiles],
  );

  return (
    <section
      className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--ds-background-100)]"
      aria-label="Conversation"
    >
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6"
      >
        <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col">
          {!hasConversation ? (
            <div className="my-auto shrink-0 pb-8 pt-4">
              <h1 className="text-[1.75rem] font-semibold tracking-[-0.04em] text-[var(--ds-gray-1000)] sm:text-[2rem]">
                {greeting}
                {firstName ? `, ${firstName}` : ""}{" "}
                <span aria-hidden>👋</span>
              </h1>
              <p className="mt-2 text-sm text-[var(--ds-gray-700)]">
                How can I help with your finances today? Type{" "}
                <kbd className="rounded bg-[var(--ds-gray-100)] px-1.5 py-0.5 text-[11px]">
                  /
                </kbd>{" "}
                for commands or{" "}
                <kbd className="rounded bg-[var(--ds-gray-100)] px-1.5 py-0.5 text-[11px]">
                  @
                </kbd>{" "}
                to attach data.
              </p>
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
                  onReviewBatch={onReviewBatch}
                  busyProposal={busyProposal}
                />
              ))}
              {loading && !streamingId ? (
                <div className="ml-11 flex items-center gap-2 text-xs text-[var(--ds-gray-700)]">
                  <span className="inline-block size-1.5 animate-pulse rounded-full bg-[var(--ds-gray-700)]" />
                  Thinking…
                </div>
              ) : null}
              <div ref={messageEndRef} aria-hidden />
            </div>
          )}
        </div>
      </div>

      {showJumpBottom ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[7.5rem] z-20 flex justify-center sm:bottom-[8rem]">
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--ds-background-elevated)] px-3 py-2 text-xs font-medium text-[var(--ds-gray-1000)] shadow-[var(--ds-shadow-menu)] ds-focus"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={14} />
            Jump to latest
          </button>
        </div>
      ) : null}

      <div className="shrink-0 bg-[color-mix(in_srgb,var(--ds-background-100)_92%,transparent)] px-4 pb-4 pt-2 backdrop-blur-md sm:px-8">
        {!perms.create ? (
          <p className="mx-auto mb-2 max-w-[720px] text-center text-[11px] text-[var(--ds-gray-700)]">
            You can view conversations, but sending messages requires AI create
            permission.
          </p>
        ) : null}
        <form
          onSubmit={(event) => {
            if (!perms.create) {
              event.preventDefault();
              return;
            }
            onSend(event);
          }}
          onDragEnter={(event) => {
            if (!perms.create) return;
            event.preventDefault();
            onDragState(true);
          }}
          onDragOver={(event) => {
            if (!perms.create) return;
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
            if (!perms.create) return;
            void onAddFiles(event.dataTransfer.files);
          }}
          className={cn(
            "relative mx-auto w-full max-w-[720px] rounded-[30px] bg-[var(--ds-background-elevated)] p-2 shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.08))] transition-[box-shadow]",
            dragActive &&
              "shadow-[0_0_0_2px_color-mix(in_srgb,var(--ds-focus-color)_35%,transparent)]",
            !perms.create && "opacity-70",
          )}
          aria-label="Message composer"
        >
          <ChatCommandMenu
            state={menu}
            onPickAt={onPickAt}
            onPickSlash={onPickSlash}
          />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/csv,application/json"
            className="sr-only"
            disabled={!perms.create || attachments.length >= 3 || loading}
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
              {attachments.map((file, index) => {
                const uploading = file.upload_status === "uploading";
                const failed = file.upload_status === "failed";
                return (
                  <div
                    key={file.client_key || `${file.name}-${index}`}
                    className={cn(
                      "group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[var(--ds-background-100)] text-xs shadow-[var(--ds-shadow-sm,0_1px_2px_rgba(0,0,0,0.08))]",
                      failed && "ring-1 ring-[var(--ds-status-red)]",
                    )}
                    title={
                      uploading
                        ? `Uploading ${file.name}…`
                        : failed
                          ? `${file.name} failed — remove and retry`
                          : file.name
                    }
                  >
                    {file.mime_type.startsWith("image/") && file.data_base64 ? (
                      <span
                        className={cn(
                          "absolute inset-0 bg-cover bg-center",
                          uploading && "opacity-40",
                        )}
                        style={{
                          backgroundImage: `url(data:${file.mime_type};base64,${file.data_base64})`,
                        }}
                        role="img"
                        aria-label={file.name}
                      />
                    ) : (
                      <span
                        className={cn(
                          "flex flex-col items-center gap-1 px-1 text-center",
                          uploading && "opacity-40",
                        )}
                      >
                        <FileText
                          size={20}
                          className="text-[var(--ds-focus-color)]"
                        />
                        <span className="w-12 truncate text-[9px]">
                          {file.name}
                        </span>
                      </span>
                    )}
                    {uploading ? (
                      <span
                        className="absolute inset-0 grid place-items-center bg-black/50"
                        aria-label={`Uploading ${file.name}, ${Math.round(file.upload_progress ?? 0)} percent`}
                      >
                        <CircularProgress
                          value={file.upload_progress ?? 6}
                          size={32}
                          strokeWidth={3}
                        />
                      </span>
                    ) : null}
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => onRemoveAttachment(index)}
                      className="absolute right-1 top-1 z-10 flex size-5 items-center justify-center rounded-full bg-[var(--ds-gray-1000)] text-[var(--ds-primary-foreground)] shadow-sm ds-focus"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
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
                  disabled={!perms.create || attachments.length >= 3 || loading}
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
                  disabled={!perms.create || loading}
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
              </div>
            </Popover>

            <Textarea
              ref={textareaRef}
              value={draft}
              readOnly={!perms.create}
              disabled={!perms.create}
              onChange={(e) => {
                if (!perms.create) return;
                const value = e.target.value;
                onDraftChange(value);
                refreshMenu(value, e.target.selectionStart ?? value.length);
              }}
              onPaste={perms.create ? onPasteFiles : undefined}
              onClick={(e) => {
                if (!perms.create) return;
                const el = e.currentTarget;
                refreshMenu(el.value, el.selectionStart ?? el.value.length);
              }}
              onKeyUp={(e) => {
                if (!perms.create) return;
                const el = e.currentTarget;
                if (
                  e.key === "ArrowLeft" ||
                  e.key === "ArrowRight" ||
                  e.key === "Home" ||
                  e.key === "End"
                ) {
                  refreshMenu(el.value, el.selectionStart ?? el.value.length);
                }
              }}
              onKeyDown={(event) => {
                if (!perms.create) {
                  event.preventDefault();
                  return;
                }
                if (menu && ["ArrowDown", "ArrowUp", "Tab"].includes(event.key)) {
                  event.preventDefault();
                  return;
                }
                if (menu && event.key === "Escape") {
                  event.preventDefault();
                  setMenu(null);
                  return;
                }
                if (menu && event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  return;
                }
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (canSend) void onSend();
                }
              }}
              placeholder={
                perms.create
                  ? "Ask anything — paste a screenshot, or try /spend"
                  : "Read-only — AI create permission required"
              }
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
                  disabled={!perms.create || !voiceSupported}
                  title={
                    !perms.create
                      ? "AI create permission required"
                      : voiceSupported
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
                  disabled={!canSend}
                  className="size-11 shrink-0 rounded-full px-0"
                  aria-label={
                    attachmentsBusy
                      ? "Wait for uploads to finish"
                      : "Send message"
                  }
                  title={
                    attachments.some((file) => file.upload_status === "uploading")
                      ? "Uploading attachment…"
                      : attachments.some((file) => file.upload_status === "failed")
                        ? "Remove failed attachments to send"
                        : undefined
                  }
                >
                  <Send size={16} />
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </section>
  );
});
