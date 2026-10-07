import {
  confirmAiProposal,
  rejectAiProposal,
} from "@/lib/api/ai";
import { getErrorMessage } from "@/lib/api/client";

export type ProposalDecisionAction = "confirm" | "reject";
export type ProposalDecisionPhase = "queued" | "calling" | "success" | "error";

export type ProposalDecisionItemProgress = {
  id: string;
  action: ProposalDecisionAction;
  phase: ProposalDecisionPhase;
  endpoint: string;
  title: string;
  actionType: string;
  summary?: string | null;
  result?: unknown;
  resultText?: string;
  error?: string;
};

export type ProposalDecisionRun = {
  total: number;
  done: number;
  confirmed: number;
  rejected: number;
  failed: number;
  items: ProposalDecisionItemProgress[];
};

export function proposalDecisionEndpoint(
  id: string,
  action: ProposalDecisionAction,
): string {
  return action === "confirm"
    ? `POST /ai/proposals/${id}/confirm`
    : `POST /ai/proposals/${id}/reject`;
}

export function summarizeProposalApiResult(result: unknown): string {
  if (result == null) return "Saved with an empty response.";
  if (typeof result === "string") {
    const text = result.trim();
    return text.length > 220 ? `${text.slice(0, 217)}…` : text || "OK";
  }
  if (typeof result !== "object") return String(result);

  const rec = result as Record<string, unknown>;
  const inner =
    rec.result !== undefined &&
    typeof rec.result === "object" &&
    rec.result !== null
      ? (rec.result as Record<string, unknown>)
      : rec;

  const bits: string[] = [];
  if (typeof rec.status === "string" && rec.status.trim()) {
    bits.push(rec.status);
  }
  const name = inner.name ?? inner.title ?? inner.payee ?? inner.merchant;
  if (typeof name === "string" && name.trim()) bits.push(name.trim());
  const amount = inner.amount ?? inner.target_amount ?? inner.balance;
  if (amount != null && String(amount).trim() !== "") {
    bits.push(String(amount));
  }
  if (typeof inner.id === "string" && inner.id) {
    bits.push(`id ${inner.id.slice(0, 8)}`);
  }
  if (typeof inner.message === "string" && inner.message.trim()) {
    bits.push(inner.message.trim());
  }
  if (bits.length) return bits.join(" · ");

  try {
    const json = JSON.stringify(inner);
    if (!json || json === "{}") return "Saved.";
    return json.length > 220 ? `${json.slice(0, 217)}…` : json;
  } catch {
    return "Saved.";
  }
}

export function createProposalDecisionRun(
  jobs: Array<{
    id: string;
    action: ProposalDecisionAction;
    title: string;
    actionType: string;
    summary?: string | null;
  }>,
): ProposalDecisionRun {
  return {
    total: jobs.length,
    done: 0,
    confirmed: 0,
    rejected: 0,
    failed: 0,
    items: jobs.map((job) => ({
      id: job.id,
      action: job.action,
      phase: "queued",
      endpoint: proposalDecisionEndpoint(job.id, job.action),
      title: job.title,
      actionType: job.actionType,
      summary: job.summary,
    })),
  };
}

export async function decideAiProposalsWithProgress(
  run: ProposalDecisionRun,
  onProgress: (next: ProposalDecisionRun) => void,
): Promise<ProposalDecisionRun> {
  let current: ProposalDecisionRun = {
    ...run,
    items: run.items.map((item) => ({ ...item })),
  };

  const emit = () => {
    onProgress({
      ...current,
      items: current.items.map((item) => ({ ...item })),
    });
  };

  emit();

  for (let index = 0; index < current.items.length; index += 1) {
    current.items[index] = { ...current.items[index], phase: "calling" };
    emit();

    const item = current.items[index];
    try {
      const result =
        item.action === "confirm"
          ? await confirmAiProposal(item.id)
          : await rejectAiProposal(item.id);
      current.items[index] = {
        ...item,
        phase: "success",
        result,
        resultText: summarizeProposalApiResult(result),
      };
      if (item.action === "confirm") current.confirmed += 1;
      else current.rejected += 1;
    } catch (error) {
      current.items[index] = {
        ...item,
        phase: "error",
        error: getErrorMessage(
          error,
          item.action === "confirm" ? "Confirm failed" : "Reject failed",
        ),
      };
      current.failed += 1;
    }
    current.done += 1;
    emit();
  }

  return current;
}
