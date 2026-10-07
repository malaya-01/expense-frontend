import { splitFencedSegments } from "@/lib/ai/streaming-markdown";

/**
 * Strip UUIDs and other machine identifiers from assistant text before display.
 * Keeps human-readable names; never shows raw IDs to end users.
 *
 * Whitespace cleanup only touches prose: indentation (nested lists) and
 * fenced code / mermaid blocks are preserved verbatim.
 */
const UUID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

function stripIdentifiers(content: string): string {
  return (
    content
      // (ID: uuid) / (id: uuid) / [ID: `uuid`]
      .replace(
        new RegExp(
          `[ \\t]*[\\(\\[]\\s*(?:id|uuid|container[_ ]?id|category[_ ]?id|account[_ ]?id)\\s*[:#]?\\s*\`?${UUID}\`?\\s*[\\)\\]]`,
          "gi",
        ),
        "",
      )
      // ID: uuid / container_id: uuid
      .replace(
        new RegExp(
          `\\b(?:id|uuid|container_id|category_id|account_id|source_container_id|destination_container_id|goal_id|budget_id|loan_id)\\s*[:=]\\s*\`?${UUID}\`?`,
          "gi",
        ),
        "",
      )
      // Bare UUIDs in backticks or alone
      .replace(new RegExp(`\`${UUID}\``, "gi"), "")
      .replace(new RegExp(`\\b${UUID}\\b`, "gi"), "")
  );
}

function tidyProse(text: string): string {
  return (
    text
      // Cleanup leftover empty parens / brackets
      .replace(/\(\s*\)/g, "")
      // (but keep GFM task-list boxes "- [ ] item")
      .replace(/([-*+] )?\[\s*\](?!\()/g, (match, marker?: string) =>
        marker ? match : "",
      )
      // Collapse inner runs of spaces only — keep leading indentation.
      .replace(/(\S)[ \t]{2,}(?=\S)/g, "$1 ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
  );
}

export function sanitizeAiChatContent(content: string): string {
  if (!content) return content;
  const normalized = content.replace(/\r\n?/g, "\n");
  return splitFencedSegments(normalized)
    .map((segment) =>
      segment.code
        ? stripIdentifiers(segment.text)
        : tidyProse(stripIdentifiers(segment.text)),
    )
    .join("\n")
    .trim();
}
