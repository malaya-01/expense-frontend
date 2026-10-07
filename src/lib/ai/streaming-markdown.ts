/**
 * Prepare assistant markdown for live rendering while tokens stream in.
 *
 * - Unfinished ```mermaid fences are re-labelled `mermaid-pending` so the
 *   renderer shows the raw source in a placeholder instead of running mermaid
 *   on every token (mermaid only ever sees complete blocks).
 * - Other unfinished code fences keep rendering as code (CommonMark runs an
 *   unclosed fence to the end of the document) so long code is not hidden.
 * - Internal ```action_proposal blocks never reach the user.
 */

export const MERMAID_PENDING_LANG = "mermaid-pending";

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/;

type FenceInfo = {
  char: string;
  len: number;
  lang: string;
  openLine: number;
};

function matchFenceOpen(line: string): FenceInfo | null {
  const match = FENCE_OPEN.exec(line);
  if (!match) return null;
  return {
    char: match[1][0],
    len: match[1].length,
    lang: (match[2] || "").toLowerCase(),
    openLine: -1,
  };
}

function isFenceClose(line: string, fence: FenceInfo): boolean {
  const match = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line);
  return Boolean(
    match && match[1][0] === fence.char && match[1].length >= fence.len,
  );
}

/** Split markdown into fenced-code and prose segments (line based). */
export function splitFencedSegments(
  text: string,
): Array<{ code: boolean; text: string }> {
  const lines = text.split("\n");
  const segments: Array<{ code: boolean; text: string }> = [];
  let current: string[] = [];
  let open: FenceInfo | null = null;

  const push = (code: boolean) => {
    if (!current.length) return;
    segments.push({ code, text: current.join("\n") });
    current = [];
  };

  for (const line of lines) {
    if (!open) {
      const fence = matchFenceOpen(line);
      if (fence) {
        push(false);
        open = fence;
      }
      current.push(line);
    } else {
      current.push(line);
      if (isFenceClose(line, open)) {
        push(true);
        open = null;
      }
    }
  }
  push(Boolean(open));
  return segments;
}

function stripActionProposals(text: string): string {
  return text.replace(/```action_proposal\b[\s\S]*?```/gi, "");
}

export function prepareStreamingMarkdown(
  content: string,
  streaming: boolean,
): string {
  const text = stripActionProposals(content.replace(/\r\n?/g, "\n"));

  if (!streaming) {
    return text;
  }

  const lines = text.split("\n");
  let open: FenceInfo | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!open) {
      const fence = matchFenceOpen(line);
      if (fence) open = { ...fence, openLine: index };
    } else if (isFenceClose(line, open)) {
      open = null;
    }
  }

  if (!open) return text;

  const before = lines.slice(0, open.openLine).join("\n").replace(/\n+$/, "");

  // Fence opener still being typed (no body yet): hide it for now.
  if (open.openLine === lines.length - 1) {
    return before;
  }

  if (/^action_proposal|^proposal/.test(open.lang)) {
    return `${before}\n\n*Preparing an action for your review…*\n`;
  }

  const body = lines.slice(open.openLine + 1);
  // Drop a closing fence that is only partially streamed (e.g. "``").
  if (body.length && /^ {0,3}(`{1,}|~{1,})\s*$/.test(body[body.length - 1])) {
    body.pop();
  }

  if (open.lang === "mermaid") {
    const fence = open.char.repeat(Math.max(3, open.len));
    return [
      before,
      "",
      `${fence}${MERMAID_PENDING_LANG}`,
      ...body,
      fence,
      "",
    ].join("\n");
  }

  return [before, "", lines[open.openLine], ...body].join("\n");
}

/** Light cleanup so mermaid is more likely to parse model output. */
export function sanitizeMermaidSource(chart: string): string {
  return chart
    .replace(/\r\n?/g, "\n")
    .trim()
    .replace(/–|—/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/ /g, " ")
    .replace(/^\s*mermaid\s*\n/i, "")
    .replace(/\n\s*(`{3,}|~{3,})\s*$/, "")
    .trim();
}
