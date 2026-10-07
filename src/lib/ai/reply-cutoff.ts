import type { AiMessage } from "@/types";

/** Follow-up sent by the "Continue" action (same conversation). */
export const CONTINUE_PROMPT = "Continue from where you stopped.";

/**
 * - truncated:   the model hit its output limit (backend flag / notice text /
 *                an unclosed code fence at the very end)
 * - interrupted: the connection failed mid-reply (partial text kept)
 * - stopped:     the user pressed Stop
 */
export type ReplyCutoff = "truncated" | "interrupted" | "stopped";

type MessageWithHints = AiMessage & {
  truncated?: boolean;
  finish_reason?: string | null;
  stop_reason?: string | null;
  metadata?: {
    truncated?: boolean;
    finish_reason?: string | null;
    stop_reason?: string | null;
  } | null;
};

const LIMIT_REASON = /^(length|max_tokens|max_output_tokens|token_limit|truncated)$/i;

const TRUNCATION_NOTICE =
  /reply (?:was )?(?:cut short|truncated)|\(reply truncated\)|output token limit|response (?:was )?(?:cut off|truncated)|ran out of (?:space|tokens)/i;

export const INTERRUPTED_MARKER = /_Reply interrupted\b[^_]*_\s*$/i;
export const STOPPED_MARKER = /_Response stopped\._\s*$/i;

function hasUnclosedFence(content: string): boolean {
  let open: string | null = null;
  for (const line of content.split("\n")) {
    const match = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (!match) continue;
    if (!open) open = match[1];
    else if (
      match[1][0] === open[0] &&
      match[1].length >= open.length &&
      /^ {0,3}(`{3,}|~{3,})\s*$/.test(line)
    ) {
      open = null;
    }
  }
  return open !== null;
}

export function detectReplyCutoff(
  message: AiMessage | undefined | null,
): ReplyCutoff | null {
  if (!message || message.role !== "assistant") return null;
  const hinted = message as MessageWithHints;
  const reasons = [
    hinted.finish_reason,
    hinted.stop_reason,
    hinted.metadata?.finish_reason,
    hinted.metadata?.stop_reason,
  ];
  if (
    hinted.truncated === true ||
    hinted.metadata?.truncated === true ||
    reasons.some((reason) => typeof reason === "string" && LIMIT_REASON.test(reason))
  ) {
    return "truncated";
  }

  const content = (message.content || "").replace(/\r\n?/g, "\n").trimEnd();
  if (!content) return null;
  const tail = content.slice(-400);
  if (INTERRUPTED_MARKER.test(tail)) return "interrupted";
  if (STOPPED_MARKER.test(tail)) return "stopped";
  if (TRUNCATION_NOTICE.test(tail)) return "truncated";
  if (hasUnclosedFence(content)) return "truncated";
  return null;
}
