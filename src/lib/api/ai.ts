import {
  api,
  getAccessToken,
  getApiBaseUrl,
  isAuthRejection,
  isRetryableWriteError,
  refreshSession,
  unwrap,
} from "./client";
import { beginApiActivity, endApiActivity } from "./activity";
import type {
  AiChatResponse,
  AiConversation,
  AiMessage,
  AiActionProposal,
  AiProviderId,
  AiSettings,
  AiMemory,
  AiAttachment,
  AiDocument,
  ReceiptParseResult,
} from "@/types";

export async function getAiSettings(): Promise<AiSettings> {
  const res = await api.get("/ai/settings");
  return unwrap<AiSettings>(res);
}

export async function upsertAiProvider(payload: {
  provider: AiProviderId;
  model?: string;
  display_name?: string;
  api_key?: string;
  base_url?: string;
  project_id?: string;
  location?: string;
  service_account_json?: string;
}) {
  const res = await api.post("/ai/providers", payload);
  return unwrap(res);
}

export async function disconnectAiProvider(provider: AiProviderId) {
  const res = await api.delete(`/ai/providers/${provider}`);
  return unwrap(res);
}

export async function testAiProvider(provider: AiProviderId) {
  const res = await api.post(`/ai/providers/${provider}/test`);
  return unwrap<{ ok: boolean; message: string; model?: string }>(res);
}

export async function listAiModels(provider: AiProviderId) {
  const res = await api.get(`/ai/providers/${provider}/models`);
  return unwrap<{ models: string[]; source: string }>(res);
}

export async function selectActiveAiProvider(payload: {
  provider: AiProviderId;
  model?: string;
}) {
  const res = await api.post("/ai/active", payload);
  return unwrap(res);
}

export async function updateMasterPrompt(master_prompt: string) {
  const { isOnline } = await import("@/lib/offline/network");
  const userRaw =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("expense-tracker:user")
      : null;
  const userId = userRaw ? JSON.parse(userRaw)?.id : null;

  if (isOnline()) {
    try {
      const res = await api.patch("/ai/master-prompt", { master_prompt });
      const data = unwrap(res);
      if (userId) {
        const { offlineDb } = await import("@/lib/offline/db");
        const existing = await offlineDb.ai_preferences.get(userId);
        await offlineDb.ai_preferences.put({
          ...(existing || {}),
          id: userId,
          user_id: userId,
          master_prompt,
          updated_at: new Date().toISOString(),
          _pending: false,
        } as any);
      }
      return data;
    } catch (error) {
      // Queue only when the server never got it; real errors go to the UI.
      if (!isRetryableWriteError(error)) throw error;
    }
  }

  if (!userId) throw new Error("Offline: user required");
  const { saveAiPreferences } = await import("@/lib/offline/repos");
  return saveAiPreferences(userId, { master_prompt });
}

export async function getAiStarters() {
  const res = await api.get("/ai/starters");
  return unwrap<{ questions: string[] }>(res);
}

export async function getAiMemories(): Promise<{
  enabled: boolean;
  memories: AiMemory[];
}> {
  const res = await api.get("/ai/memories");
  return unwrap(res);
}

export async function addAiMemory(content: string): Promise<AiMemory> {
  const { isOnline } = await import("@/lib/offline/network");
  if (isOnline()) {
    try {
      const res = await api.post("/ai/memories", { content });
      return unwrap(res);
    } catch (error) {
      if (!isRetryableWriteError(error)) throw error;
    }
  }
  const userRaw = localStorage.getItem("expense-tracker:user");
  const userId = userRaw ? JSON.parse(userRaw)?.id : null;
  if (!userId) throw new Error("Offline: user required");
  const { addAiMemoryLocal } = await import("@/lib/offline/repos");
  return addAiMemoryLocal(userId, content) as Promise<AiMemory>;
}

export async function deleteAiMemory(id: string) {
  try {
    const res = await api.delete(`/ai/memories/${id}`);
    return unwrap(res);
  } catch (error) {
    if (!isRetryableWriteError(error)) throw error;
    const { offlineDb } = await import("@/lib/offline/db");
    const { enqueueOutbox } = await import("@/lib/offline/outbox");
    const { isOnline } = await import("@/lib/offline/network");
    const { scheduleSync } = await import("@/lib/offline/sync-engine");
    const existing = await offlineDb.ai_memories.get(id);
    await offlineDb.ai_memories.put({
      ...(existing || { id }),
      id,
      deleted_at: new Date().toISOString(),
      _pending: true,
    } as any);
    await enqueueOutbox({
      entity_type: "ai_memory",
      entity_id: id,
      op: "delete",
      payload: {},
      base_sync_version: Number(existing?.sync_version || 1),
    });
    if (isOnline()) scheduleSync("ai_memory_delete");
    return { id };
  }
}

export async function setAiMemoryEnabled(enabled: boolean) {
  try {
    const res = await api.patch("/ai/memories/preference", { enabled });
    return unwrap<{ enabled: boolean }>(res);
  } catch (error) {
    if (!isRetryableWriteError(error)) throw error;
    const userRaw = localStorage.getItem("expense-tracker:user");
    const userId = userRaw ? JSON.parse(userRaw)?.id : null;
    if (!userId) throw new Error("Offline: user required");
    const { saveAiPreferences } = await import("@/lib/offline/repos");
    await saveAiPreferences(userId, { memory_enabled: enabled });
    return { enabled };
  }
}

export async function listAiConversations(
  q?: string,
  options?: { archived?: boolean },
): Promise<AiConversation[]> {
  const res = await api.get("/ai/conversations", {
    params: {
      ...(q ? { q } : {}),
      ...(options?.archived ? { archived: "true" } : {}),
    },
  });
  return unwrap<AiConversation[]>(res);
}

export async function getAiConversation(id: string): Promise<{
  conversation: AiConversation;
  messages: AiMessage[];
  proposals: AiActionProposal[];
}> {
  const res = await api.get(`/ai/conversations/${id}`);
  return unwrap(res);
}

export async function renameAiConversation(id: string, title: string) {
  const res = await api.patch(`/ai/conversations/${id}`, { title });
  return unwrap<AiConversation>(res);
}

export async function pinAiConversation(id: string, pinned: boolean) {
  const res = await api.post(`/ai/conversations/${id}/pin`, { pinned });
  return unwrap<AiConversation>(res);
}

export async function duplicateAiConversation(id: string) {
  const res = await api.post(`/ai/conversations/${id}/duplicate`);
  return unwrap<AiConversation>(res);
}

export async function archiveAiConversation(id: string, archived = true) {
  const res = await api.post(`/ai/conversations/${id}/archive`, { archived });
  return unwrap<{ id: string; archived_at: string | null }>(res);
}

export async function deleteAiConversation(id: string) {
  const res = await api.delete(`/ai/conversations/${id}`);
  return unwrap(res);
}

export async function listPendingAiProposals(): Promise<AiActionProposal[]> {
  const res = await api.get("/ai/proposals/pending");
  return unwrap<AiActionProposal[]>(res);
}

export async function listAiDocuments(): Promise<AiDocument[]> {
  const res = await api.get("/ai/documents");
  return unwrap<AiDocument[]>(res);
}

export async function getAiDocument(id: string): Promise<AiDocument> {
  const res = await api.get(`/ai/documents/${id}`);
  return unwrap<AiDocument>(res);
}

export async function uploadAiDocument(
  payload: {
    name: string;
    mime_type: string;
    data_base64: string;
    conversation_id?: string;
  },
  options?: {
    onProgress?: (percent: number) => void;
  },
): Promise<AiDocument> {
  // Send a pre-sized JSON body so XHR can report real loaded/total bytes.
  // (Posting a plain object often skips useful upload progress events.)
  const body = JSON.stringify(payload);
  const res = await api.post("/ai/documents", body, {
    headers: { "Content-Type": "application/json" },
    onUploadProgress: (event) => {
      if (!options?.onProgress || !event.total) return;
      options.onProgress(
        Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))),
      );
    },
  });
  // Do not force 100% here — caller maps progress from upload events and
  // treats HTTP completion as "stored" (analysis may still be running).
  return unwrap<AiDocument>(res);
}

export async function deleteAiDocument(id: string) {
  const res = await api.delete(`/ai/documents/${id}`);
  return unwrap(res);
}

export async function sendAiChat(payload: {
  content: string;
  conversation_id?: string;
  attachments?: AiAttachment[];
  web_search?: boolean;
  invoked_tools?: string[];
}): Promise<AiChatResponse> {
  const res = await api.post("/ai/chat", payload);
  return unwrap<AiChatResponse>(res);
}

export type AiStreamEvent =
  | { type: "status"; message: string }
  | { type: "meta"; conversation_id: string; provider: string; model: string }
  | { type: "delta"; text: string }
  | {
      type: "context";
      tool_activity: AiChatResponse["tool_activity"];
      citations: AiChatResponse["citations"];
    }
  | ({
      type: "done";
      /** Optional backend hints that the reply hit an output limit. */
      truncated?: boolean;
      finish_reason?: string | null;
      stop_reason?: string | null;
    } & AiChatResponse)
  | { type: "error"; message: string }
  | { type: "close" };

/**
 * No bytes at all (not even an SSE comment / status) for this long means the
 * connection is dead. Generous so slow providers + backend auto-continuation fit.
 */
const STREAM_IDLE_TIMEOUT_MS = 180_000;

/** Thrown when the stream dies without a `done` / `error` event. */
export class AiStreamInterruptedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiStreamInterruptedError";
  }
}

const TRUNCATION_REASONS =
  /^(length|max_tokens|max_output_tokens|token_limit|truncated)$/i;

/** Accepts `truncated: true` or a provider finish/stop reason on any level. */
function isTruncationHint(source: unknown, depth = 0): boolean {
  if (!source || typeof source !== "object" || depth > 2) return false;
  const record = source as Record<string, unknown>;
  if (record.truncated === true) return true;
  for (const key of [
    "finish_reason",
    "stop_reason",
    "finishReason",
    "stopReason",
  ]) {
    const value = record[key];
    if (typeof value === "string" && TRUNCATION_REASONS.test(value.trim())) {
      return true;
    }
  }
  return isTruncationHint(record.metadata, depth + 1);
}

/**
 * Parse one SSE event block (lines already split, line endings stripped).
 * Joins multi-line `data:` fields per the SSE spec; ignores comments / ids.
 */
function parseSseBlock(lines: string[]): AiStreamEvent | null {
  const data: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    if (field !== "data") continue;
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    data.push(value);
  }
  if (!data.length) return null;
  const raw = data.join("\n").trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AiStreamEvent;
    return parsed && typeof parsed === "object" && "type" in parsed
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export async function streamAiChat(
  payload: {
    content: string;
    conversation_id?: string;
    attachments?: AiAttachment[];
    web_search?: boolean;
    invoked_tools?: string[];
  },
  handlers: {
    onEvent: (event: AiStreamEvent) => void | Promise<void>;
    signal?: AbortSignal;
  },
): Promise<void> {
  beginApiActivity();
  try {
  // Runtime base (honours the Settings / Capacitor override).
  const base = getApiBaseUrl();
  // With CapacitorHttp enabled, window.fetch is patched to the native bridge,
  // which buffers the whole response (no SSE streaming) and ignores abort.
  // Capacitor keeps the WebView's real fetch as CapacitorWebFetch.
  const webFetch: typeof fetch =
    (typeof window !== "undefined" &&
      (window as unknown as { CapacitorWebFetch?: typeof fetch })
        .CapacitorWebFetch) ||
    fetch;
  const body = JSON.stringify(payload);
  const send = (token: string | undefined) =>
    webFetch(`${base}/ai/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
      signal: handlers.signal,
      credentials: "include",
      cache: "no-store",
    });

  let res = await send(getAccessToken());
  if (res.status === 401) {
    // Release the rejected response before retrying.
    void res.body?.cancel().catch(() => undefined);
    // Access token expired mid-session: refresh once (single-flight) and retry.
    let fresh: string | undefined;
    try {
      fresh = await refreshSession();
    } catch (error) {
      throw new Error(
        isAuthRejection(error)
          ? "Your session has expired. Please sign in again."
          : "Could not refresh your session. Check your connection and try again.",
      );
    }
    res = await send(fresh);
  }

  if (!res.ok) {
    let message = `Stream failed (${res.status})`;
    try {
      const data = await res.json();
      message = data?.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (!res.body) throw new Error("Empty stream response");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const signal = handlers.signal;
  let buffer = "";
  let pendingLines: string[] = [];
  let pendingDelta = "";
  let streamedText = "";
  let finished = false;

  // A throwing UI handler must never kill the network stream: rendering is
  // React's job (guarded by error boundaries); this loop only moves data.
  const safeEmit = async (event: AiStreamEvent) => {
    if (signal?.aborted) return;
    try {
      await handlers.onEvent(event);
    } catch (error) {
      console.error("[ai-stream] event handler failed", event.type, error);
    }
  };

  const flushDelta = async () => {
    if (!pendingDelta) return;
    const text = pendingDelta;
    pendingDelta = "";
    await emitStreamingText(text, safeEmit, signal);
  };

  const handleEvent = async (event: AiStreamEvent) => {
    if (event.type === "delta") {
      if (typeof event.text === "string" && event.text) {
        pendingDelta += event.text;
        streamedText += event.text;
      }
      return;
    }
    // Keep ordering: text received before a status/done lands first.
    await flushDelta();
    if (event.type === "done") {
      finished = true;
      await safeEmit(normalizeDoneEvent(event, streamedText));
      return;
    }
    if (event.type === "error") {
      finished = true;
      await safeEmit(event);
      throw new Error(event.message || "Advisor request failed");
    }
    await safeEmit(event);
  };

  const consumeLines = async (final: boolean) => {
    // SSE allows \r\n, \n or \r line endings. A trailing lone \r stays in the
    // buffer because its \n may arrive with the next network chunk.
    let start = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const ch = buffer[i];
      if (ch !== "\n" && ch !== "\r") continue;
      if (ch === "\r" && i === buffer.length - 1 && !final) break;
      const line = buffer.slice(start, i);
      if (ch === "\r" && buffer[i + 1] === "\n") i += 1;
      start = i + 1;
      if (line === "") {
        const event = parseSseBlock(pendingLines);
        pendingLines = [];
        if (event) await handleEvent(event);
      } else {
        pendingLines.push(line);
      }
    }
    buffer = buffer.slice(start);
    if (final) {
      // Stream ended without a trailing blank line: dispatch what is left.
      if (buffer) pendingLines.push(buffer);
      buffer = "";
      const event = parseSseBlock(pendingLines);
      pendingLines = [];
      if (event) await handleEvent(event);
    }
  };

  try {
    while (true) {
      const { done, value } = await readWithIdleTimeout(
        reader,
        STREAM_IDLE_TIMEOUT_MS,
      );
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      await consumeLines(false);
      // Coalesce every delta from this network chunk into one UI update.
      await flushDelta();
    }
    buffer += decoder.decode();
    await consumeLines(true);
    await flushDelta();
  } catch (error) {
    // Text already shown stays on screen; the caller decides how to surface it.
    void reader.cancel().catch(() => undefined);
    throw error;
  }

  if (!finished && !signal?.aborted) {
    throw new AiStreamInterruptedError(
      "Network connection closed before the reply finished. The partial answer is kept — retry or continue.",
    );
  }
  } finally {
    endApiActivity();
  }
}

function normalizeDoneEvent(
  event: Extract<AiStreamEvent, { type: "done" }>,
  streamedText: string,
): Extract<AiStreamEvent, { type: "done" }> {
  const truncated =
    isTruncationHint(event) || isTruncationHint(event.message);
  let message = event.message as AiMessage | undefined;
  if (
    !message ||
    typeof message !== "object" ||
    typeof message.id !== "string"
  ) {
    // Malformed / missing persisted message: keep what the user already saw.
    message = {
      id: `stream-done-${Date.now()}`,
      role: "assistant",
      content: streamedText,
      created_at: new Date().toISOString(),
    };
  } else if (typeof message.content !== "string") {
    message = { ...message, content: streamedText };
  }
  if (!message.created_at) {
    message = { ...message, created_at: new Date().toISOString() };
  }
  if (truncated) {
    message = { ...message, truncated: true } as AiMessage;
  }
  return {
    ...event,
    message,
    proposals: Array.isArray(event.proposals) ? event.proposals : [],
  };
}

async function readWithIdleTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new AiStreamInterruptedError(
          "Network timeout: the advisor stopped responding. The partial answer is kept — retry or continue.",
        ),
      );
    }, timeoutMs);
  });
  try {
    return await Promise.race([reader.read(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function emitStreamingText(
  text: string,
  onEvent: (event: AiStreamEvent) => void | Promise<void>,
  signal?: AbortSignal,
) {
  // One UI update per network chunk keeps phones responsive. Large bursts
  // (some providers deliver the whole reply at once) are split into a bounded
  // number of frames so the reply still appears progressively.
  const characters = Array.from(text);
  const MAX_FRAMES = 24;
  const chunkSize = Math.max(64, Math.ceil(characters.length / MAX_FRAMES));

  for (let index = 0; index < characters.length; index += chunkSize) {
    if (signal?.aborted) return;
    await onEvent({
      type: "delta",
      text: characters.slice(index, index + chunkSize).join(""),
    });
    if (index + chunkSize < characters.length) {
      await sleep(16);
    }
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function confirmAiProposal(id: string) {
  const res = await api.post(`/ai/proposals/${id}/confirm`);
  return unwrap(res);
}

export async function rejectAiProposal(id: string) {
  const res = await api.post(`/ai/proposals/${id}/reject`);
  return unwrap(res);
}

export async function bulkDecideAiProposals(payload: {
  confirm_ids?: string[];
  reject_ids?: string[];
}): Promise<{
  confirmed: Array<{ id: string; status: string }>;
  rejected: Array<{ id: string; status: string }>;
  failed: Array<{ id: string; action: string; error: string }>;
  summary: { confirmed: number; rejected: number; failed: number };
}> {
  const res = await api.post("/ai/proposals/bulk", payload);
  return unwrap(res);
}

export async function parseReceipt(payload: {
  name: string;
  mime_type: string;
  data_base64: string;
}): Promise<ReceiptParseResult> {
  const res = await api.post("/ai/receipts/parse", payload);
  return unwrap<ReceiptParseResult>(res);
}
