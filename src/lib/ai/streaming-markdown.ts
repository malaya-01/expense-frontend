/**
 * Prepare assistant markdown for live rendering while tokens stream in.
 * Incomplete fenced blocks (esp. mermaid) must not be passed to the renderer.
 */
export function prepareStreamingMarkdown(
  content: string,
  streaming: boolean,
): string {
  const text = content.replace(/\r\n/g, "\n");

  if (!streaming) {
    return text;
  }

  const fenceMatches = [...text.matchAll(/^```([^\n`]*)\n/gm)];
  if (!fenceMatches.length) {
    // Opened a fence on the final line with no body yet.
    if (
      /```[^\n]*$/.test(text) &&
      (text.match(/```/g) || []).length % 2 === 1
    ) {
      return `${text.replace(/```[^\n]*$/, "").replace(/\n+$/, "")}\n\n*Drawing…*\n`;
    }
    return text;
  }

  const last = fenceMatches[fenceMatches.length - 1];
  const openAt = last.index ?? -1;
  if (openAt < 0) return text;

  const afterOpen = text.slice(openAt + last[0].length);
  const closed = /(^|\n)```/.test(afterOpen);
  if (closed) return text;

  const lang = (last[1] || "").trim().toLowerCase();
  const before = text.slice(0, openAt).replace(/\n+$/, "");
  const placeholder =
    lang === "mermaid"
      ? "\n\n*Drawing diagram…*\n"
      : "\n\n*Writing code…*\n";

  return `${before}${placeholder}`;
}

/** Light cleanup so mermaid is more likely to parse model output. */
export function sanitizeMermaidSource(chart: string): string {
  return chart
    .trim()
    .replace(/\u2013|\u2014/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^\s*mermaid\s*\n/i, "");
}
