import { api, getAccessToken, unwrap } from "./client";
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
  const res = await api.patch("/ai/master-prompt", { master_prompt });
  return unwrap(res);
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
  const res = await api.post("/ai/memories", { content });
  return unwrap(res);
}

export async function deleteAiMemory(id: string) {
  const res = await api.delete(`/ai/memories/${id}`);
  return unwrap(res);
}

export async function setAiMemoryEnabled(enabled: boolean) {
  const res = await api.patch("/ai/memories/preference", { enabled });
  return unwrap<{ enabled: boolean }>(res);
}

export async function listAiConversations(
  q?: string,
): Promise<AiConversation[]> {
  const res = await api.get("/ai/conversations", {
    params: q ? { q } : undefined,
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

export async function uploadAiDocument(payload: {
  name: string;
  mime_type: string;
  data_base64: string;
  conversation_id?: string;
}): Promise<AiDocument> {
  const res = await api.post("/ai/documents", payload);
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
  },
  handlers: {
    onEvent: (event: AiStreamEvent) => void | Promise<void>;
    signal?: AbortSignal;
  },
): Promise<void> {
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
    const events: AiStreamEvent[] = [];

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
      events.push(event);
    }

    let pendingText = "";
    for (const event of events) {
      if (event.type === "delta") {
        pendingText += event.text;
        continue;
      }

      if (pendingText) {
        await emitStreamingText(pendingText, handlers.onEvent);
        pendingText = "";
      }

      await handlers.onEvent(event);
      if (event.type === "error") {
        throw new Error(event.message);
      }
    }

    if (pendingText) {
      await emitStreamingText(pendingText, handlers.onEvent);
    }
  }
}

async function emitStreamingText(
  text: string,
  onEvent: (event: AiStreamEvent) => void | Promise<void>,
) {
  const characters = Array.from(text);
  const chunkSize = 28;

  for (let index = 0; index < characters.length; index += chunkSize) {
    await onEvent({
      type: "delta",
      text: characters.slice(index, index + chunkSize).join(""),
    });

    if (index + chunkSize < characters.length) {
      await waitForPaint();
    }
  }
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      setTimeout(resolve, 0);
      return;
    }
    window.requestAnimationFrame(() => resolve());
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
