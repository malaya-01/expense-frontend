"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { humanizeAdvisorStatus, nextRotatingAdvisorStatus } from "@/components/ai/tool-labels";
import { parseInvokedToolsFromText } from "@/lib/ai/command-catalog";
import { invalidateProposalNameMaps } from "@/components/ai/proposal-payload-view";
import { getErrorMessage } from "@/lib/api/client";
import { humanizeAiProviderError, type AiErrorInfo } from "@/lib/ai/provider-errors";
import {
  archiveAiConversation,
  bulkDecideAiProposals,
  confirmAiProposal,
  deleteAiConversation,
  deleteAiDocument,
  duplicateAiConversation,
  getAiConversation,
  getAiDocument,
  getAiSettings,
  listAiConversations,
  listAiDocuments,
  listPendingAiProposals,
  pinAiConversation,
  rejectAiProposal,
  renameAiConversation,
  selectActiveAiProvider,
  streamAiChat,
  uploadAiDocument,
} from "@/lib/api/ai";
import { fileToBase64WithProgress } from "@/lib/ai/file-to-base64";
import { getReportOverview } from "@/lib/api/reports";
import type {
  AiActionProposal,
  AiAttachment,
  AiCitation,
  AiConversation,
  AiDocument,
  AiMessage,
  AiSettings,
  AiToolActivity,
  ReportOverview,
} from "@/types";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
]);

export function useAiAdvisorWorkspace() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const autoSent = useRef(false);

  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [proposals, setProposals] = useState<AiActionProposal[]>([]);
  const [pendingGlobal, setPendingGlobal] = useState<AiActionProposal[]>([]);
  const [documents, setDocuments] = useState<AiDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [selectedDocument, setSelectedDocument] = useState<AiDocument | null>(
    null,
  );
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [starters, setStarters] = useState<string[]>([]);
  const [draft, setDraft] = useState(initialQ);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [errorInfo, setErrorInfo] = useState<AiErrorInfo | null>(null);
  const [failedPrompt, setFailedPrompt] = useState("");
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<AiActionProposal | null>(null);
  const [batchReviewOpen, setBatchReviewOpen] = useState(false);
  const [batchReviewIds, setBatchReviewIds] = useState<string[] | null>(null);
  const [busyProposal, setBusyProposal] = useState<string | null>(null);
  const [busyBulk, setBusyBulk] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [archivedView, setArchivedView] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const lastFocusRefresh = useRef(0);

  const clearError = useCallback(() => {
    setError("");
    setErrorInfo(null);
    setFailedPrompt("");
  }, []);

  // Keep waiting copy alive — never leave a single stale “personalized” line.
  useEffect(() => {
    if (!streamingId || !loading) return;
    const streamMsg = messages.find((m) => m.id === streamingId);
    if (streamMsg?.content?.trim()) return;
    let tick = 0;
    const id = window.setInterval(() => {
      tick += 1;
      setStatus((prev) => {
        // Prefer live backend status; only rotate when idle/static.
        if (
          prev &&
          !/personalized response|thinking…$/i.test(prev) &&
          /trying |finding |opening |reading |connected|retry|route|opal advisor/i.test(
            prev,
          )
        ) {
          return prev;
        }
        return nextRotatingAdvisorStatus(tick);
      });
    }, 2200);
    return () => window.clearInterval(id);
  }, [streamingId, loading, messages]);

  const reportError = useCallback((err: unknown, fallback: string) => {
    const info = humanizeAiProviderError(
      typeof err === "string" ? err : getErrorMessage(err, fallback),
      fallback,
    );
    setErrorInfo(info);
    setError(info.message);
  }, []);

  useEffect(() => {
    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition
        : undefined;
    setVoiceSupported(Boolean(SpeechRecognitionCtor));
  }, []);

  const refreshLists = useCallback(
    async (options?: {
      silent?: boolean;
      q?: string;
      archived?: boolean;
    }) => {
      if (!options?.silent) setPageLoading(true);
      try {
        const q = options?.q ?? "";
        const archived = Boolean(options?.archived);
        const [s, c, pending, docs, report] = await Promise.all([
          getAiSettings(),
          listAiConversations(q || undefined, { archived }).catch(() => []),
          listPendingAiProposals().catch(() => []),
          listAiDocuments().catch(() => []),
          getReportOverview(3).catch(() => null),
        ]);
        setSettings(s);
        setConversations(c);
        setPendingGlobal(pending);
        setDocuments(docs);
        if (report) setOverview(report);
      } catch (err) {
        if (!options?.silent) {
          reportError(err, "Could not load advisor");
        }
      } finally {
        if (!options?.silent) setPageLoading(false);
      }
    },
    [reportError],
  );

  useEffect(() => {
    void refreshLists({ archived: archivedView, q: search });
  }, [refreshLists, archivedView]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshLists({ silent: true, q: search, archived: archivedView });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, archivedView, refreshLists]);

  useEffect(() => {
    setRailCollapsed(
      window.localStorage.getItem("finos.ai.conversations.collapsed") === "true",
    );
  }, []);

  const updateRailCollapsed = useCallback(
    (value: boolean | ((current: boolean) => boolean)) => {
      setRailCollapsed((current) => {
        const next = typeof value === "function" ? value(current) : value;
        window.localStorage.setItem(
          "finos.ai.conversations.collapsed",
          String(next),
        );
        return next;
      });
    },
    [],
  );

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
    setErrorInfo(null);
    try {
      const data = await getAiConversation(id);
      setActiveId(id);
      setMessages(data.messages);
      setProposals(data.proposals || []);
      setStarters([]);
    } catch (err) {
      reportError(err, "Could not open conversation");
    }
  }, [reportError]);

  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
    setMessages([]);
    setProposals([]);
    setDraft("");
    setAttachments([]);
    setWebSearchEnabled(false);
    clearError();
    setStatus("");
    setStarters([]);
    setSelectedDocumentId(null);
    setSelectedDocument(null);
    setArchivedView(false);
  }, [clearError]);

  const onSend = useCallback(
    async (e?: FormEvent, content?: string) => {
      e?.preventDefault();
      const selectedAttachments = attachments;
      const text =
        (content ?? draft).trim() ||
        (selectedAttachments.length
          ? "Analyze the attached file and tell me what it contains."
          : "");
      if (!text || loading) return;
      if (
        selectedAttachments.some(
          (file) =>
            file.upload_status === "uploading" || file.upload_status === "failed",
        )
      ) {
        reportError(
          selectedAttachments.some((file) => file.upload_status === "failed")
            ? "Remove failed attachments before sending."
            : "Wait for attachments to finish uploading.",
          "Could not send message",
        );
        return;
      }

      const invokedTools = parseInvokedToolsFromText(text);
      const shouldSearchWeb =
        webSearchEnabled || invokedTools.includes("search_public_web");

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const requestTime = Date.now();
      const streamMsgId = `stream-${requestTime}`;
      const userMsgId = `local-user-${requestTime}`;
      setLoading(true);
      setStreamingId(streamMsgId);
      clearError();
      setStatus("Opening your Financial Twin…");
      setStarters([]);
      setDraft("");
      setAttachments([]);
      setWebSearchEnabled(false);
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          role: "user",
          content: text,
          attachments: selectedAttachments.map(
            ({ name, mime_type, data_base64 }) => ({
              name,
              mime_type,
              data_base64,
            }),
          ),
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
            attachments: selectedAttachments.map(
              ({ name, mime_type, data_base64 }) => ({
                name,
                mime_type,
                data_base64,
              }),
            ),
            web_search: shouldSearchWeb || undefined,
            invoked_tools: invokedTools,
          },
          {
            signal: ac.signal,
            onEvent: async (event) => {
              if (ac.signal.aborted) return;
              if (event.type === "status") {
                setStatus(humanizeAdvisorStatus(event.message));
              } else if (event.type === "meta") {
                setActiveId(event.conversation_id);
              } else if (event.type === "context") {
                setStatus(
                  humanizeAdvisorStatus("Finding a free Opal route…"),
                );
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
                setStatus("");
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamMsgId
                      ? { ...m, content: m.content + event.text }
                      : m,
                  ),
                );
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
                if (event.conversation_title) {
                  const titled = event.conversation_title;
                  setConversations((prev) => {
                    const exists = prev.some(
                      (c) => c.id === event.conversation_id,
                    );
                    if (!exists) {
                      return [
                        {
                          id: event.conversation_id,
                          title: titled,
                          last_message_preview: event.message.content
                            ?.replace(/\s+/g, " ")
                            .trim()
                            .slice(0, 160),
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        },
                        ...prev,
                      ];
                    }
                    return prev.map((c) =>
                      c.id === event.conversation_id
                        ? { ...c, title: titled, updated_at: new Date().toISOString() }
                        : c,
                    );
                  });
                }
                setStarters([]);
                setStatus("");
              } else if (event.type === "error") {
                // streamAiChat throws after this; catch handles cleanup + friendly copy.
                setStatus("");
              }
            },
          },
        );
        if (!ac.signal.aborted) {
          await refreshLists({ silent: true, archived: archivedView, q: search });
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError" || ac.signal.aborted) {
          setStatus("");
          clearError();
          setMessages((prev) => {
            const stream = prev.find((m) => m.id === streamMsgId);
            if (stream?.content?.trim()) {
              return prev.map((m) =>
                m.id === streamMsgId
                  ? {
                      ...m,
                      content: `${m.content.trim()}\n\n_Response stopped._`,
                    }
                  : m,
              );
            }
            return prev.filter(
              (m) => m.id !== streamMsgId && m.id !== userMsgId,
            );
          });
        } else {
          reportError(err, "Advisor request failed");
          setFailedPrompt(text);
          setDraft(text);
          setAttachments(selectedAttachments);
          setWebSearchEnabled(shouldSearchWeb);
          setMessages((prev) => {
            const stream = prev.find((m) => m.id === streamMsgId);
            // Keep partial reply if any tokens arrived; otherwise remove the empty bubble.
            if (stream?.content?.trim()) {
              return prev.map((m) =>
                m.id === streamMsgId
                  ? {
                      ...m,
                      content: `${m.content.trim()}\n\n_Reply interrupted — see the notice above to retry._`,
                    }
                  : m,
              );
            }
            return prev.filter(
              (m) => m.id !== streamMsgId && m.id !== userMsgId,
            );
          });
        }
      } finally {
        setLoading(false);
        setStreamingId(null);
        setStatus("");
        abortRef.current = null;
      }
    },
    [
      activeId,
      archivedView,
      attachments,
      clearError,
      draft,
      loading,
      refreshLists,
      reportError,
      search,
      webSearchEnabled,
    ],
  );

  const addFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files?.length) return;
      clearError();
      const slots = Math.max(0, 3 - attachments.length);
      for (const file of Array.from(files).slice(0, slots)) {
        if (!ALLOWED_TYPES.has(file.type)) {
          reportError(`${file.name}: unsupported file type.`, "Upload failed");
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          reportError(
            `${file.name}: file must be 5 MB or smaller.`,
            "Upload failed",
          );
          continue;
        }

        const clientKey = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
        // Real progress only: file-read bytes → 0–20%, network upload bytes → 20–100%.
        const setProgress = (percent: number) => {
          setAttachments((current) =>
            current.map((item) =>
              item.client_key === clientKey
                ? {
                    ...item,
                    upload_status: "uploading" as const,
                    upload_progress: Math.max(0, Math.min(100, Math.round(percent))),
                  }
                : item,
            ),
          );
        };

        setAttachments((current) =>
          [
            ...current,
            {
              name: file.name,
              mime_type: file.type,
              client_key: clientKey,
              upload_status: "uploading" as const,
              upload_progress: 0,
            },
          ].slice(0, 3),
        );

        let data_base64 = "";
        try {
          data_base64 = await fileToBase64WithProgress(file, (readPercent) => {
            // File read is a small slice of overall transfer progress.
            setProgress(Math.round(readPercent * 0.15));
          });
        } catch {
          setAttachments((current) =>
            current.filter((item) => item.client_key !== clientKey),
          );
          reportError(`${file.name}: could not read file.`, "Upload failed");
          continue;
        }

        setAttachments((current) =>
          current.map((item) =>
            item.client_key === clientKey
              ? {
                  ...item,
                  data_base64,
                  upload_status: "uploading",
                  upload_progress: 15,
                }
              : item,
          ),
        );

        const optimisticDocument: AiDocument = {
          id: clientKey,
          name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          status: "analyzing",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setDocuments((prev) => [optimisticDocument, ...prev]);

        try {
          const document = await uploadAiDocument(
            {
              name: file.name,
              mime_type: file.type,
              data_base64,
              conversation_id: activeId || undefined,
            },
            {
              onProgress: (uploadPercent) => {
                // Network bytes only — never fake the remaining AI analysis wait.
                setProgress(15 + Math.round(uploadPercent * 0.85));
              },
            },
          );
          // Upload HTTP finished = file is stored. Clear the ring immediately.
          setAttachments((current) =>
            current.map((item) =>
              item.client_key === clientKey
                ? {
                    ...item,
                    upload_status: "ready",
                    upload_progress: 100,
                  }
                : item,
            ),
          );
          setDocuments((prev) => [
            document,
            ...prev.filter(
              (item) => item.id !== clientKey && item.id !== document.id,
            ),
          ]);

          // Provider analysis continues server-side; refresh until ready/failed.
          if (document.status === "analyzing") {
            void (async () => {
              for (let attempt = 0; attempt < 40; attempt += 1) {
                await new Promise((resolve) => window.setTimeout(resolve, 1500));
                try {
                  const latest = await getAiDocument(document.id);
                  setDocuments((prev) =>
                    prev.map((item) =>
                      item.id === document.id ? latest : item,
                    ),
                  );
                  if (
                    latest.status === "ready" ||
                    latest.status === "failed"
                  ) {
                    break;
                  }
                } catch {
                  break;
                }
              }
            })();
          }
        } catch (err) {
          setAttachments((current) =>
            current.map((item) =>
              item.client_key === clientKey
                ? { ...item, upload_status: "failed" }
                : item,
            ),
          );
          setDocuments((prev) => prev.filter((item) => item.id !== clientKey));
          reportError(
            err,
            `${file.name}: upload failed. Remove and try again.`,
          );
        }
      }
    },
    [activeId, attachments.length, clearError, reportError],
  );

  useEffect(() => {
    if (!initialQ || autoSent.current) return;
    if (!settings?.active_provider) return;
    autoSent.current = true;
    void onSend(undefined, initialQ);
  }, [initialQ, settings?.active_provider, onSend]);

  const onConfirm = useCallback(async () => {
    if (!confirming) return;
    setBusyProposal(confirming.id);
    try {
      await confirmAiProposal(confirming.id);
      invalidateProposalNameMaps();
      setProposals((prev) =>
        prev.map((p) =>
          p.id === confirming.id ? { ...p, status: "confirmed" } : p,
        ),
      );
      setPendingGlobal((prev) => prev.filter((p) => p.id !== confirming.id));
      setConfirming(null);
    } catch (err) {
      reportError(err, "Could not confirm action");
    } finally {
      setBusyProposal(null);
    }
  }, [confirming, reportError]);

  const onReject = useCallback(async (id: string) => {
    setBusyProposal(id);
    try {
      await rejectAiProposal(id);
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "rejected" } : p)),
      );
      setPendingGlobal((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      reportError(err, "Could not reject action");
    } finally {
      setBusyProposal(null);
    }
  }, [reportError]);

  const openBatchReview = useCallback((ids?: string[]) => {
    setBatchReviewIds(ids?.length ? ids : null);
    setBatchReviewOpen(true);
  }, []);

  const closeBatchReview = useCallback(() => {
    setBatchReviewOpen(false);
    setBatchReviewIds(null);
  }, []);

  const onBulkDecide = useCallback(
    async (decision: { confirm_ids: string[]; reject_ids: string[] }) => {
      if (!decision.confirm_ids.length && !decision.reject_ids.length) return;
      setBusyBulk(true);
      try {
        const result = await bulkDecideAiProposals(decision);
        if (decision.confirm_ids.length) invalidateProposalNameMaps();
        const confirmed = new Set(
          (result.confirmed || []).map((row) => row.id),
        );
        const rejected = new Set((result.rejected || []).map((row) => row.id));
        setProposals((prev) =>
          prev.map((p) => {
            if (confirmed.has(p.id)) return { ...p, status: "confirmed" };
            if (rejected.has(p.id)) return { ...p, status: "rejected" };
            return p;
          }),
        );
        setPendingGlobal((prev) =>
          prev.filter((p) => !confirmed.has(p.id) && !rejected.has(p.id)),
        );
        if (result.failed?.length) {
          reportError(
            `${result.failed.length} action${result.failed.length === 1 ? "" : "s"} failed. Others were applied.`,
            "Bulk review failed",
          );
        } else {
          setBatchReviewOpen(false);
          setBatchReviewIds(null);
        }
        await refreshLists({ silent: true });
      } catch (err) {
        reportError(err, "Bulk review failed");
      } finally {
        setBusyBulk(false);
      }
    },
    [refreshLists, reportError],
  );

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      const updated = await renameAiConversation(id, title);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updated } : c)),
      );
    },
    [],
  );

  const pinConversation = useCallback(async (id: string, pinned: boolean) => {
    const updated = await pinAiConversation(id, pinned);
    setConversations((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...updated } : c));
      return [...next].sort((a, b) => {
        if (Boolean(a.pinned_at) !== Boolean(b.pinned_at)) {
          return a.pinned_at ? -1 : 1;
        }
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
    });
  }, []);

  const duplicateConversation = useCallback(
    async (id: string) => {
      const created = await duplicateAiConversation(id);
      await refreshLists({ silent: true });
      await loadConversation(created.id);
    },
    [loadConversation, refreshLists],
  );

  const removeConversation = useCallback(
    async (id: string) => {
      await deleteAiConversation(id);
      if (activeId === id) startNewChat();
      await refreshLists({ silent: true });
    },
    [activeId, refreshLists, startNewChat],
  );

  const archiveConversation = useCallback(
    async (id: string) => {
      await archiveAiConversation(id, true);
      setConversations((prev) => prev.filter((item) => item.id !== id));
      if (activeId === id) startNewChat();
    },
    [activeId, startNewChat],
  );

  const unarchiveConversation = useCallback(
    async (id: string) => {
      await archiveAiConversation(id, false);
      setConversations((prev) => prev.filter((item) => item.id !== id));
      if (activeId === id) {
        setArchivedView(false);
        await loadConversation(id);
      }
    },
    [activeId, loadConversation],
  );

  const toggleArchivedView = useCallback(() => {
    setArchivedView((current) => !current);
    setSearch("");
  }, []);

  const selectDocument = useCallback(async (id: string | null) => {
    setSelectedDocumentId(id);
    if (!id) {
      setSelectedDocument(null);
      return;
    }
    try {
      const doc = await getAiDocument(id);
      setSelectedDocument(doc);
    } catch (err) {
      reportError(err, "Could not open document");
    }
  }, [reportError]);

  const removeDocument = useCallback(
    async (id: string) => {
      await deleteAiDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (selectedDocumentId === id) {
        setSelectedDocumentId(null);
        setSelectedDocument(null);
      }
    },
    [selectedDocumentId],
  );

  const toggleVoice = useCallback(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      reportError(
        "Voice input is not supported in this browser.",
        "Voice unavailable",
      );
      return;
    }
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript || "";
      }
      if (transcript.trim()) {
        setDraft((prev) =>
          prev ? `${prev.trim()} ${transcript.trim()}` : transcript.trim(),
        );
      }
    };
    recognition.onerror = () => {
      setListening(false);
      setError("Voice capture failed. You can keep typing instead.");
      setErrorInfo(
        humanizeAiProviderError(
          "Voice capture failed. You can keep typing instead.",
        ),
      );
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  const activateSavedProvider = useCallback(async () => {
    const freeProvider = settings?.providers.find(
      (provider) =>
        provider.provider === "omniroute" ||
        provider.platform_free ||
        provider.credentials_meta?.no_auth_required,
    );
    const savedProvider =
      freeProvider ||
      settings?.providers.find(
        (provider) =>
          provider.credentials_meta?.has_api_key ||
          provider.credentials_meta?.has_service_account,
      );
    if (!savedProvider) return;
    setLoading(true);
    clearError();
    try {
      await selectActiveAiProvider({
        provider: savedProvider.provider,
        model: savedProvider.model || undefined,
      });
      await refreshLists({ silent: true });
    } catch (err) {
      reportError(err, "Could not activate provider");
    } finally {
      setLoading(false);
    }
  }, [clearError, refreshLists, reportError, settings?.providers]);

  const pendingProposals = useMemo(() => {
    const map = new Map<string, AiActionProposal>();
    for (const item of pendingGlobal) map.set(item.id, item);
    for (const item of proposals.filter((p) => p.status === "pending")) {
      map.set(item.id, item);
    }
    return [...map.values()];
  }, [pendingGlobal, proposals]);

  const batchReviewProposals = useMemo(() => {
    if (!batchReviewIds?.length) return pendingProposals;
    const allow = new Set(batchReviewIds);
    return pendingProposals.filter((p) => allow.has(p.id));
  }, [batchReviewIds, pendingProposals]);

  const needsProvider = !settings?.active_provider;
  const savedProvider =
    settings?.providers.find(
      (provider) =>
        provider.provider === "omniroute" ||
        provider.platform_free ||
        provider.credentials_meta?.no_auth_required,
    ) ||
    settings?.providers.find(
      (provider) =>
        provider.credentials_meta?.has_api_key ||
        provider.credentials_meta?.has_service_account,
    );

  return {
    settings,
    conversations,
    search,
    setSearch,
    archivedView,
    toggleArchivedView,
    activeId,
    messages,
    proposals,
    pendingProposals,
    documents,
    selectedDocumentId,
    selectedDocument,
    overview,
    starters,
    draft,
    setDraft,
    status,
    error,
    errorInfo,
    setError: (value: string) => {
      if (!value) {
        clearError();
        return;
      }
      setError(value);
      setErrorInfo(humanizeAiProviderError(value));
    },
    clearError,
    failedPrompt,
    attachments,
    setAttachments,
    dragActive,
    setDragActive,
    loading,
    pageLoading,
    streamingId,
    confirming,
    setConfirming,
    batchReviewOpen,
    setBatchReviewOpen,
    batchReviewProposals,
    openBatchReview,
    closeBatchReview,
    onBulkDecide,
    busyProposal,
    busyBulk,
    listening,
    voiceSupported,
    webSearchEnabled,
    setWebSearchEnabled,
    railCollapsed,
    setRailCollapsed: updateRailCollapsed,
    abortRef,
    messageEndRef,
    needsProvider,
    savedProvider,
    refreshLists,
    loadConversation,
    startNewChat,
    onSend,
    addFiles,
    onConfirm,
    onReject,
    renameConversation,
    pinConversation,
    duplicateConversation,
    archiveConversation,
    unarchiveConversation,
    removeConversation,
    selectDocument,
    removeDocument,
    toggleVoice,
    activateSavedProvider,
  };
}
