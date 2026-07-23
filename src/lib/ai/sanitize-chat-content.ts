/**
 * Strip UUIDs and other machine identifiers from assistant text before display.
 * Keeps human-readable names; never shows raw IDs to end users.
 */
const UUID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export function sanitizeAiChatContent(content: string): string {
  if (!content) return content;
  return content
    // (ID: uuid) / (id: uuid) / [ID: `uuid`]
    .replace(
      new RegExp(
        `\\s*[\\(\\[]\\s*(?:id|uuid|container[_ ]?id|category[_ ]?id|account[_ ]?id)\\s*[:#]?\\s*\`?${UUID}\`?\\s*[\\)\\]]`,
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
    // Cleanup leftover empty parens / double spaces
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
