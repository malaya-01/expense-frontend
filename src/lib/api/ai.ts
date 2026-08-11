import { api, getAccessToken, unwrap } from "./client";
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
  try {
    const res = await api.patch("/ai/master-prompt", { master_prompt });
    const data = unwrap(res);
    const userRaw = localStorage.getItem("expense-tracker:user");
    const userId = userRaw ? JSON.parse(userRaw)?.id : null;
    if (userId) {
      const { saveAiPreferences } = await import("@/lib/offline/repos");
      await saveAiPreferences(userId, { master_prompt });
    }
    return data;
  } catch {
    const userRaw = localStorage.getItem("expense-tracker:user");
    const userId = userRaw ? JSON.parse(userRaw)?.id : null;
    if (!userId) throw new Error("Offline: user required");
    const { saveAiPreferences } = await import("@/lib/offline/repos");
    return saveAiPreferences(userId, { master_prompt });
  }
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
  try {
    const res = await api.post("/ai/memories", { content });
    return unwrap(res);
  } catch {
    const userRaw = localStorage.getItem("expense-tracker:user");
    const userId = userRaw ? JSON.parse(userRaw)?.id : null;
    if (!userId) throw new Error("Offline: user required");
    const { addAiMemoryLocal } = await import("@/lib/offline/repos");
    return addAiMemoryLocal(userId, content) as Promise<AiMemory>;
  }
}

export async function deleteAiMemory(id: string) {
  try {
    const res = await api.delete(`/ai/memories/${id}`);
    return unwrap(res);
  } catch {
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
  } catch {
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
  | ({ type: "done" } & AiChatResponse)
  | { type: "error"; message: string }
  | { type: "close" };

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
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000/api";
  const token = getAccessToken();

  const res = await fetch(`${base}/ai/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: handlers.signal,
    credentials: "include",
  });

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
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"));
      if (!line) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;
      let event: AiStreamEvent;
      try {
        event = JSON.parse(raw) as AiStreamEvent;
      } catch {
        continue;
      }

      if (event.type === "delta") {
        await emitStreamingText(event.text, handlers.onEvent);
        continue;
      }

      await handlers.onEvent(event);
      if (event.type === "error") {
        throw new Error(event.message);
      }
    }
  }
  } finally {
    endApiActivity();
  }
}

async function emitStreamingText(
  text: string,
  onEvent: (event: AiStreamEvent) => void | Promise<void>,
) {
  // Small chunks + short delay so replies feel continuous instead of batched.
  const characters = Array.from(text);
  const chunkSize = 3;
  const delayMs = 10;

  for (let index = 0; index < characters.length; index += chunkSize) {
    await onEvent({
      type: "delta",
      text: characters.slice(index, index + chunkSize).join(""),
    });

    if (index + chunkSize < characters.length) {
      await sleep(delayMs);
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
