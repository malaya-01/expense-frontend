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
import { humanizeAdvisorStatus } from "@/components/ai/tool-labels";
import { getErrorMessage } from "@/lib/api/client";
import {
  archiveAiConversation,
  confirmAiProposal,
  deleteAiConversation,
  deleteAiDocument,
  duplicateAiConversation,
  getAiConversation,
  getAiDocument,
  getAiSettings,
  getAiStarters,
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
  const [failedPrompt, setFailedPrompt] = useState("");
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<AiActionProposal | null>(null);
  const [busyProposal, setBusyProposal] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const lastFocusRefresh = useRef(0);
  const defaultStartersRef = useRef<string[]>([]);

  useEffect(() => {
    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition
        : undefined;
    setVoiceSupported(Boolean(SpeechRecognitionCtor));
  }, []);

  const refreshLists = useCallback(
    async (options?: { silent?: boolean; q?: string }) => {
      if (!options?.silent) setPageLoading(true);
      try {
        const q = options?.q ?? "";
        const [s, c, st, pending, docs, report] = await Promise.all([
          getAiSettings(),
          listAiConversations(q || undefined).catch(() => []),
          getAiStarters().catch(() => ({ questions: [] as string[] })),
          listPendingAiProposals().catch(() => []),
          listAiDocuments().catch(() => []),
          getReportOverview(3).catch(() => null),
        ]);
        setSettings(s);
        setConversations(c);
        if (st.questions?.length) {
          defaultStartersRef.current = st.questions;
          setStarters((prev) => (prev.length ? prev : st.questions));
        }
        setPendingGlobal(pending);
        setDocuments(docs);
        if (report) setOverview(report);
      } catch (err) {
        if (!options?.silent) {
          setError(getErrorMessage(err, "Could not load advisor"));
        }
      } finally {
        if (!options?.silent) setPageLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshLists({ silent: true, q: search });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, refreshLists]);

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
    if (!messages.length) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    messageEndRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [messages, status]);

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
      setStarters(contextualFollowUps(data.messages));
    } catch (err) {
      setError(getErrorMessage(err, "Could not open conversation"));
    }
  }, []);

  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
    setMessages([]);
    setProposals([]);
    setDraft("");
    setAttachments([]);
    setWebSearchEnabled(false);
    setError("");
    setFailedPrompt("");
    setStatus("");
    setStarters(defaultStartersRef.current);
    setSelectedDocumentId(null);
    setSelectedDocument(null);
  }, []);

  const onSend = useCallback(
    async (e?: FormEvent, content?: string) => {
      e?.preventDefault();
      const selectedAttachments = attachments;
      const shouldSearchWeb = webSearchEnabled;
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
      setStatus("Thinking…");
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
            web_search: shouldSearchWeb || undefined,
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
                setStatus("Generating personalized response…");
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
                if (event.suggested_questions?.length) {
                  setStarters(event.suggested_questions);
                }
                setStatus("");
              } else if (event.type === "error") {
                setError(humanizeAdvisorStatus(event.message));
                setStatus("");
              }
            },
          },
        );
        if (!ac.signal.aborted) {
          await refreshLists({ silent: true });
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError" || ac.signal.aborted) {
          setStatus("");
          setError("");
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
          setError(getErrorMessage(err, "Advisor request failed"));
          setFailedPrompt(text);
          setDraft(text);
          setAttachments(selectedAttachments);
          setWebSearchEnabled(shouldSearchWeb);
          setMessages((prev) =>
            prev.filter((m) => m.id !== streamMsgId && m.id !== userMsgId),
          );
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
      attachments,
      draft,
      loading,
      refreshLists,
      webSearchEnabled,
    ],
  );

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setError("");
      const next: AiAttachment[] = [];
      for (const file of Array.from(files).slice(0, 3 - attachments.length)) {
        if (!ALLOWED_TYPES.has(file.type)) {
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
        const data_base64 = dataUrl.split(",")[1] || "";
        next.push({
          name: file.name,
          mime_type: file.type,
          data_base64,
        });
        const optimisticId = `upload-${Date.now()}-${file.name}`;
        const optimisticDocument: AiDocument = {
          id: optimisticId,
          name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          status: "analyzing",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setDocuments((prev) => [optimisticDocument, ...prev]);
        void uploadAiDocument({
            name: file.name,
            mime_type: file.type,
            data_base64,
            conversation_id: activeId || undefined,
          })
          .then((document) => {
            setDocuments((prev) => [
              document,
              ...prev.filter(
                (item) =>
                  item.id !== optimisticId && item.id !== document.id,
              ),
            ]);
          })
          .catch(() => {
            setDocuments((prev) =>
              prev.filter((item) => item.id !== optimisticId),
            );
          });
      }
      setAttachments((current) => [...current, ...next].slice(0, 3));
    },
    [activeId, attachments.length],
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
      setProposals((prev) =>
        prev.map((p) =>
          p.id === confirming.id ? { ...p, status: "confirmed" } : p,
        ),
      );
      setPendingGlobal((prev) => prev.filter((p) => p.id !== confirming.id));
      setConfirming(null);
    } catch (err) {
      setError(getErrorMessage(err, "Could not confirm action"));
    } finally {
      setBusyProposal(null);
    }
  }, [confirming]);

  const onReject = useCallback(async (id: string) => {
    setBusyProposal(id);
    try {
      await rejectAiProposal(id);
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "rejected" } : p)),
      );
      setPendingGlobal((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, "Could not reject action"));
    } finally {
      setBusyProposal(null);
    }
  }, []);

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
      await archiveAiConversation(id);
      setConversations((prev) => prev.filter((item) => item.id !== id));
      if (activeId === id) startNewChat();
    },
    [activeId, startNewChat],
  );

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
      setError(getErrorMessage(err, "Could not open document"));
    }
  }, []);

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
      setError("Voice input is not supported in this browser.");
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
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  const activateSavedProvider = useCallback(async () => {
    const savedProvider = settings?.providers.find(
      (provider) =>
        provider.credentials_meta?.has_api_key ||
        provider.credentials_meta?.has_service_account,
    );
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
  }, [refreshLists, settings?.providers]);

  const pendingProposals = useMemo(() => {
    const map = new Map<string, AiActionProposal>();
    for (const item of pendingGlobal) map.set(item.id, item);
    for (const item of proposals.filter((p) => p.status === "pending")) {
      map.set(item.id, item);
    }
    return [...map.values()];
  }, [pendingGlobal, proposals]);

  const needsProvider = !settings?.active_provider;
  const savedProvider = settings?.providers.find(
    (provider) =>
      provider.credentials_meta?.has_api_key ||
      provider.credentials_meta?.has_service_account,
  );

  return {
    settings,
    conversations,
    search,
    setSearch,
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
    setError,
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
    busyProposal,
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
    removeConversation,
    selectDocument,
    removeDocument,
    toggleVoice,
    activateSavedProvider,
  };
}

function contextualFollowUps(messages: AiMessage[]): string[] {
  const latestUser = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content;
  const latestAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")?.content;
  const prompt = (latestUser || "").toLowerCase();
  const conversation = `${latestUser || ""} ${latestAssistant || ""}`.toLowerCase();

  if (/document|statement|pdf|csv|receipt|invoice|upload/.test(conversation)) {
    return [
      "Which transactions in this document need my attention?",
      "Are there any unusual charges?",
      "Compare this with my connected accounts.",
      "What action should I take next?",
    ];
  }
  if (/budget|overspend|spending limit/.test(prompt)) {
    return [
      "Which categories should I adjust first?",
      "Show me a more conservative option.",
      "How would this affect my savings goals?",
      "Turn this into a budget I can confirm.",
    ];
  }
  if (/spend|expense|transaction|money go|categor/.test(prompt)) {
    return [
      "Which expenses are unusual or avoidable?",
      "Compare this with the previous month.",
      "Where is the biggest saving opportunity?",
      "Create an action plan to reduce this spending.",
    ];
  }
  if (/goal|save|saving|emergency fund/.test(prompt)) {
    return [
      "How much should I save each month?",
      "What could delay this goal?",
      "Show me a faster and a safer plan.",
      "Turn this into a goal I can track.",
    ];
  }
  if (/debt|loan|liabilit|repay|credit/.test(prompt)) {
    return [
      "Which debt should I pay down first?",
      "Compare avalanche and snowball plans.",
      "How much interest could I save?",
      "Build a monthly repayment plan.",
    ];
  }
  if (/invest|portfolio|holding|stock|fund|return/.test(prompt)) {
    return [
      "Where is my portfolio most concentrated?",
      "How has this performed over time?",
      "What risks should I review first?",
      "How does this affect my financial plan?",
    ];
  }
  return [
    "Explain the most important insight in more detail.",
    "What is the biggest risk I should consider?",
    "What should I do first based on this answer?",
    "Show me an alternative approach.",
  ];
}
