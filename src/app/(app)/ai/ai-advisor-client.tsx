"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Paperclip,
  Plus,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MessageBubble } from "@/components/ai/message-bubble";
import { ProposalConfirmModal } from "@/components/ai/proposal-confirm-modal";
import { getErrorMessage } from "@/lib/api/client";
import {
  confirmAiProposal,
  deleteAiConversation,
  getAiConversation,
  getAiSettings,
  getAiStarters,
  listAiConversations,
  rejectAiProposal,
  selectActiveAiProvider,
  streamAiChat,
} from "@/lib/api/ai";
import type {
  AiActionProposal,
  AiConversation,
  AiMessage,
  AiSettings,
  AiToolActivity,
  AiCitation,
  AiAttachment,
} from "@/types";
import { cn } from "@/lib/cn";

export default function AiAdvisorPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const autoSent = useRef(false);

  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [proposals, setProposals] = useState<AiActionProposal[]>([]);
  const [starters, setStarters] = useState<string[]>([]);
  const [draft, setDraft] = useState(initialQ);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [failedPrompt, setFailedPrompt] = useState("");
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<AiActionProposal | null>(null);
  const [busyProposal, setBusyProposal] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const refreshLists = useCallback(async (options?: { silent?: boolean }) => {
    // Only the very first load blanks the page. Later refreshes run in the
    // background so switching tabs or staging an attachment never wipes the UI.
    if (!options?.silent) setPageLoading(true);
    try {
      const [s, c, st] = await Promise.all([
        getAiSettings(),
        listAiConversations().catch(() => []),
        getAiStarters().catch(() => ({ questions: [] as string[] })),
      ]);
      setSettings(s);
      setConversations(c);
      setStarters((prev) => (st.questions?.length ? st.questions : prev));
    } catch (err) {
      if (!options?.silent) setError(getErrorMessage(err, "Could not load advisor"));
    } finally {
      if (!options?.silent) setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  useEffect(() => {
    if (!messages.length) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    messageEndRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [messages, status]);

  // Keep the sidebar/provider status current when returning to the tab,
  // but silently: this never toggles pageLoading and never touches the
  // draft, staged attachments, or the open conversation. Throttled so
  // rapid focus/blur (e.g. the file picker) can't spam the API.
  const lastFocusRefresh = useRef(0);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastFocusRefresh.current < 15000) return;
      lastFocusRefresh.current = now;
      void refreshLists({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshLists]);

  const loadConversation = useCallback(async (id: string) => {
    setError("");
    try {
      const data = await getAiConversation(id);
      setActiveId(id);
      setMessages(data.messages);
      setProposals(data.proposals || []);
    } catch (err) {
      setError(getErrorMessage(err, "Could not open conversation"));
    }
  }, []);

  async function onSend(e?: FormEvent, content?: string) {
    e?.preventDefault();
    const selectedAttachments = attachments;
    const text =
      (content ?? draft).trim() ||
      (selectedAttachments.length
        ? "Analyze the attached file and tell me what it contains."
        : "");
    if (!text || loading) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const requestTime = Date.now();
    const streamMsgId = `stream-${requestTime}`;
    const userMsgId = `local-user-${requestTime}`;
    setLoading(true);
    setStreamingId(streamMsgId);
    setError("");
    setFailedPrompt("");
    setStatus("");
    setDraft("");
    setAttachments([]);
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        content: text,
        attachments: selectedAttachments.map(({ name, mime_type }) => ({
          name,
          mime_type,
        })),
        created_at: new Date().toISOString(),
      },
      {
        id: streamMsgId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      await streamAiChat(
        {
          content: text,
          conversation_id: activeId || undefined,
          attachments: selectedAttachments,
        },
        {
          signal: ac.signal,
          onEvent: async (event) => {
            if (event.type === "status") {
              setStatus(event.message);
            } else if (event.type === "meta") {
              setActiveId(event.conversation_id);
            } else if (event.type === "context") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamMsgId
                    ? {
                        ...m,
                        tool_activity: event.tool_activity as AiToolActivity[],
                        citations: event.citations as AiCitation[],
                      }
                    : m,
                ),
              );
            } else if (event.type === "delta") {
              // Provider SSE frames can contain whole phrases. Reveal small
              // slices so the response reads naturally instead of flashing in.
              for (let index = 0; index < event.text.length; index += 4) {
                if (ac.signal.aborted) break;
                const slice = event.text.slice(index, index + 4);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamMsgId
                      ? { ...m, content: m.content + slice }
                      : m,
                  ),
                );
                await new Promise((resolve) => window.setTimeout(resolve, 14));
              }
            } else if (event.type === "done") {
              setActiveId(event.conversation_id);
              setMessages((prev) =>
                prev.map((m) => (m.id === streamMsgId ? event.message : m)),
              );
              setProposals((prev) => {
                const map = new Map(prev.map((p) => [p.id, p]));
                for (const p of event.proposals || []) map.set(p.id, p);
                return [...map.values()];
              });
              if (event.suggested_questions?.length) {
                setStarters(event.suggested_questions);
              }
              setStatus("");
            } else if (event.type === "error") {
              setError(event.message);
              setStatus("");
            }
          },
        },
      );
      await refreshLists({ silent: true });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setStatus("");
        setError("Cancelled");
      } else {
        setError(getErrorMessage(err, "Advisor request failed"));
        setFailedPrompt(text);
        setDraft(text);
        setAttachments(selectedAttachments);
        setMessages((prev) =>
          prev.filter((m) => m.id !== streamMsgId && m.id !== userMsgId),
        );
      }
    } finally {
      setLoading(false);
      setStreamingId(null);
      abortRef.current = null;
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const next: AiAttachment[] = [];
    const allowed = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "application/pdf",
      "text/plain",
      "text/csv",
      "application/json",
    ]);
    for (const file of Array.from(files).slice(0, 3 - attachments.length)) {
      if (!allowed.has(file.type)) {
        setError(`${file.name}: unsupported file type.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name}: file must be 5 MB or smaller.`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      next.push({
        name: file.name,
        mime_type: file.type,
        data_base64: dataUrl.split(",")[1] || "",
      });
    }
    setAttachments((current) => [...current, ...next].slice(0, 3));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    if (!initialQ || autoSent.current) return;
    if (!settings) return;
    if (!settings.active_provider) return;
    autoSent.current = true;
    void onSend(undefined, initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ, settings?.active_provider]);

  async function onConfirm() {
    if (!confirming) return;
    setBusyProposal(confirming.id);
    try {
      await confirmAiProposal(confirming.id);
      setProposals((prev) =>
        prev.map((p) =>
          p.id === confirming.id ? { ...p, status: "confirmed" } : p,
        ),
      );
      setConfirming(null);
    } catch (err) {
      setError(getErrorMessage(err, "Could not confirm action"));
    } finally {
      setBusyProposal(null);
    }
  }

  async function onReject(id: string) {
    setBusyProposal(id);
    try {
      await rejectAiProposal(id);
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "rejected" } : p)),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Could not reject action"));
    } finally {
      setBusyProposal(null);
    }
  }

  const pendingProposals = useMemo(
    () => proposals.filter((p) => p.status === "pending"),
    [proposals],
  );

  const needsProvider = !settings?.active_provider;
  const savedProvider = settings?.providers.find(
    (provider) =>
      provider.credentials_meta?.has_api_key ||
      provider.credentials_meta?.has_service_account,
  );

  async function activateSavedProvider() {
    if (!savedProvider) return;
    setLoading(true);
    setError("");
    try {
      await selectActiveAiProvider({
        provider: savedProvider.provider,
        model: savedProvider.model || undefined,
      });
      await refreshLists({ silent: true });
    } catch (err) {
      setError(getErrorMessage(err, "Could not activate provider"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="AI Advisor"
        description="Ask FinOS what to do next — grounded in your twin, with confirmations before any change."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={!activeId && messages.length === 0}
              onClick={() => {
                abortRef.current?.abort();
                setActiveId(null);
                setMessages([]);
                setProposals([]);
                setDraft("");
                setAttachments([]);
                setError("");
                setFailedPrompt("");
                setStatus("");
              }}
            >
              New chat
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/settings")}
            >
              Settings
            </Button>
          </div>
        }
      />

      {pageLoading ? (
        <div className="grid min-h-[440px] place-items-center rounded-[16px] bg-[var(--ds-background-elevated)] ds-strong-border">
          <div className="text-center">
            <span className="mx-auto mb-3 block size-5 animate-spin rounded-full border-2 border-[var(--ds-gray-700)] border-r-transparent" />
            <p className="text-sm text-[var(--ds-gray-900)]">
              Loading your financial advisor…
            </p>
          </div>
        </div>
      ) : null}

      {!pageLoading && needsProvider ? (
        <section className="overflow-hidden rounded-[16px] bg-[var(--ds-background-elevated)] ds-strong-border">
          <div className="grid gap-8 px-6 py-10 md:grid-cols-[minmax(0,1fr)_280px] md:px-10 md:py-12">
            <div className="max-w-2xl">
              <span className="mb-5 inline-flex rounded-full bg-[var(--ds-gray-100)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--ds-gray-900)]">
                One step to start
              </span>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ds-gray-1000)]">
                Connect FinOS to an AI model
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ds-gray-900)]">
                Your financial context stays on the FinOS backend. Choose a
                provider, test it, and the Advisor can analyze your twin,
                remember preferences, and prepare actions for your approval.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {savedProvider ? (
                  <Button loading={loading} onClick={activateSavedProvider}>
                    Activate {savedProvider.provider}
                  </Button>
                ) : null}
                <Button
                  variant={savedProvider ? "secondary" : "primary"}
                  onClick={() => router.push("/settings")}
                >
                  {savedProvider ? "Review provider settings" : "Connect a provider"}
                </Button>
              </div>
              {savedProvider ? (
                <p className="mt-3 text-xs text-[var(--ds-gray-700)]">
                  Saved: {savedProvider.provider} ·{" "}
                  {savedProvider.model || "model not selected"}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 rounded-[12px] bg-[var(--ds-background-100)] p-4 ds-strong-border">
              {[
                ["1", "Connect", "Add an API key or Vertex JSON"],
                ["2", "Test", "Verify model access"],
                ["3", "Ask", "Start with a suggested question"],
              ].map(([step, title, description]) => (
                <div
                  key={step}
                  className="flex gap-3 rounded-[9px] bg-[var(--ds-background-elevated)] p-3 ds-border"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--ds-gray-1000)] text-[11px] text-[var(--ds-primary-foreground)]">
                    {step}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-[var(--ds-gray-1000)]">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--ds-gray-700)]">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {error ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[8px] bg-[var(--ds-background-elevated)] p-3 ds-strong-border">
          <p className="text-sm text-[var(--ds-status-red)]">{error}</p>
          {failedPrompt ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void onSend(undefined, failedPrompt)}
            >
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}
      {status && loading ? (
        <p className="mb-4 text-xs text-[var(--ds-gray-700)]">{status}</p>
      ) : null}

      {!pageLoading && !needsProvider ? (
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_270px]">
        <Card className="h-fit overflow-hidden ds-strong-border">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2>Conversations</h2>
                <p className="mt-1 text-[11px] text-[var(--ds-gray-700)]">
                  Your private chat history
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveId(null);
                  setMessages([]);
                  setProposals([]);
                  setDraft("");
                  setAttachments([]);
                }}
                className="flex size-7 items-center justify-center rounded-[6px] bg-[var(--ds-gray-1000)] text-sm text-[var(--ds-primary-foreground)]"
                aria-label="New conversation"
              >
                <Plus size={15} />
              </button>
            </div>
          </CardHeader>
          <CardBody className="space-y-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-[var(--ds-gray-700)]">No chats yet.</p>
            ) : (
              conversations.map((c) => (
                <div key={c.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => loadConversation(c.id)}
                    className={cn(
                      "min-w-0 flex-1 rounded-[6px] px-2.5 py-2 text-left text-[13px] ds-focus",
                      activeId === c.id
                        ? "bg-[var(--ds-gray-100)] text-[var(--ds-gray-1000)]"
                        : "text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)]",
                    )}
                  >
                    <span className="block truncate">{c.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--ds-gray-700)]">
                      {c.provider || "—"} · {c.model || "—"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex size-8 shrink-0 items-center justify-center rounded-[7px] text-[var(--ds-status-red)] opacity-70 hover:bg-[var(--ds-danger-hover)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 ds-focus"
                    aria-label={`Delete ${c.title}`}
                    onClick={async () => {
                      await deleteAiConversation(c.id);
                      if (activeId === c.id) {
                        setActiveId(null);
                        setMessages([]);
                        setProposals([]);
                      }
                      await refreshLists({ silent: true });
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card className="flex min-h-[640px] flex-col overflow-hidden ds-strong-border">
          <CardHeader className="pb-4 ds-header-rule">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2>FinOS Advisor</h2>
                <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                  Personal CFO · grounded in your financial twin
                </p>
              </div>
              <div className="rounded-full bg-[var(--ds-gray-100)] px-3 py-1.5 text-[11px] text-[var(--ds-gray-900)]">
                <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[var(--ds-status-green)]" />
                {settings?.active_provider} · {settings?.active_model || "model"}
              </div>
            </div>
          </CardHeader>
          <CardBody className="flex flex-1 flex-col gap-4">
            <div className="flex max-h-[470px] min-h-[360px] flex-1 flex-col space-y-3 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="my-auto py-8 text-center">
                  <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-[12px] bg-[var(--ds-gray-1000)] text-lg font-semibold text-[var(--ds-primary-foreground)]">
                    F
                  </div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--ds-gray-1000)]">
                    What should we work on?
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-[var(--ds-gray-700)]">
                    Ask about cash flow, spending, budgets, goals, investments,
                    or the next best action.
                  </p>
                  <div className="mx-auto mt-6 grid max-w-2xl gap-2 sm:grid-cols-2">
                    {starters.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={needsProvider || loading}
                        onClick={() => onSend(undefined, q)}
                        className="rounded-[10px] bg-[var(--ds-background-100)] px-4 py-3 text-left text-xs leading-4 text-[var(--ds-gray-1000)] ds-strong-border transition-colors hover:bg-[var(--ds-gray-100)] disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    streaming={m.id === streamingId}
                    proposals={proposals.filter((p) =>
                      (m.proposal_ids || []).includes(p.id),
                    )}
                    onConfirm={(p) => setConfirming(p)}
                    onReject={onReject}
                    busyProposal={busyProposal}
                  />
                ))
              )}
              <div ref={messageEndRef} aria-hidden />
            </div>

            <form
              onSubmit={onSend}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDragActive(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                void addFiles(event.dataTransfer.files);
              }}
              className={cn(
                "relative rounded-[14px] bg-[var(--ds-background-100)] p-2 ds-strong-border transition-[border-color,background-color]",
                dragActive &&
                  "border-[var(--ds-focus-color)] bg-[color-mix(in_srgb,var(--ds-focus-color)_6%,var(--ds-background-100))]",
              )}
            >
              {dragActive ? (
                <div className="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-[10px] border border-dashed border-[var(--ds-focus-color)] bg-[var(--ds-background-elevated)]/90 backdrop-blur-sm">
                  <div className="text-center">
                    <Paperclip
                      size={20}
                      className="mx-auto text-[var(--ds-focus-color)]"
                    />
                    <p className="mt-2 text-xs font-medium">
                      Drop files to attach
                    </p>
                  </div>
                </div>
              ) : null}
              {attachments.length ? (
                <div className="flex flex-wrap gap-2 px-2 pt-2">
                  {attachments.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex max-w-[220px] items-center gap-2 rounded-[8px] bg-[var(--ds-background-elevated)] px-2.5 py-2 text-xs ds-border"
                    >
                      {file.mime_type.startsWith("image/") &&
                      file.data_base64 ? (
                        <img
                          src={`data:${file.mime_type};base64,${file.data_base64}`}
                          alt=""
                          className="size-9 shrink-0 rounded-[7px] object-cover ds-border"
                        />
                      ) : (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-[var(--ds-gray-100)] text-[11px] font-medium uppercase text-[var(--ds-gray-900)]">
                          {file.mime_type === "application/pdf" ? "PDF" : "DOC"}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-[var(--ds-gray-1000)]">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          setAttachments((items) =>
                            items.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        className="text-[var(--ds-gray-700)] hover:text-[var(--ds-gray-1000)]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void onSend();
                  }
                }}
                placeholder="Ask FinOS anything…"
                className="min-h-[76px] resize-none border-0 bg-transparent shadow-none"
                disabled={needsProvider}
              />
              <div className="flex items-center justify-between gap-2 px-1 pb-1">
                <div className="flex items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/csv,application/json"
                    className="sr-only"
                    onChange={(event) => void addFiles(event.target.files)}
                  />
                  <button
                    type="button"
                    title="Attach image or file"
                    disabled={attachments.length >= 3 || loading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex size-9 items-center justify-center rounded-[8px] text-lg text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] disabled:opacity-40"
                    aria-label="Attach image or file"
                  >
                    <Paperclip size={17} />
                  </button>
                  <p className="hidden text-[10px] text-[var(--ds-gray-700)] sm:block">
                    Images, PDF, text, CSV or JSON · 5 MB each
                  </p>
                </div>
                <div className="flex gap-2">
                {loading ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => abortRef.current?.abort()}
                  >
                    <Square size={13} />
                    Stop
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  loading={loading}
                  disabled={needsProvider || (!draft.trim() && !attachments.length)}
                  className="size-9 rounded-[9px] px-0"
                  aria-label="Send message"
                >
                  <Send size={15} />
                </Button>
                </div>
              </div>
            </form>
          </CardBody>
        </Card>

        <aside className="space-y-4 lg:col-start-2 xl:col-start-3 xl:row-start-1">
          <Card className="ds-strong-border">
            <CardHeader>
              <h2>Pending actions</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {pendingProposals.length === 0 ? (
                <p className="text-xs text-[var(--ds-gray-700)]">
                  When FinOS proposes a change, it appears here for confirmation.
                </p>
              ) : (
                pendingProposals.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-[8px] bg-[var(--ds-background-100)] p-3"
                  >
                    <p className="text-sm text-[var(--ds-gray-1000)]">{p.title}</p>
                    {p.summary ? (
                      <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                        {p.summary}
                      </p>
                    ) : null}
                    <div className="mt-2 flex gap-1">
                      <Button size="sm" onClick={() => setConfirming(p)}>
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onReject(p.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card className="ds-strong-border">
            <CardHeader>
              <h2>Modules</h2>
            </CardHeader>
            <CardBody className="flex flex-wrap gap-2">
              {[
                ["/accounts", "Accounts"],
                ["/expenses", "Transactions"],
                ["/budgets", "Budgets"],
                ["/goals", "Goals"],
                ["/investments", "Investments"],
                ["/reports", "Reports"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full bg-[var(--ds-background-100)] px-3 py-1 text-xs text-[var(--ds-gray-1000)] ds-border"
                >
                  {label}
                </Link>
              ))}
            </CardBody>
          </Card>
        </aside>
      </div>
      ) : null}

      <ProposalConfirmModal
        proposal={confirming}
        busy={busyProposal === confirming?.id}
        onClose={() => setConfirming(null)}
        onConfirm={onConfirm}
      />
    </div>
  );
}
