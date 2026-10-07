/**
 * Space URLs use query params instead of dynamic path segments so they work in
 * the static export used by the Android app (only placeholder params can be
 * pre-rendered there). The legacy `/spaces/<id>` and `/spaces/invites/<token>`
 * routes still exist for old web links.
 */
export function spaceHref(spaceId: string): string {
  return `/spaces/view?id=${encodeURIComponent(spaceId)}`;
}

export function spaceInviteHref(token: string): string {
  return `/spaces/invites/accept?token=${encodeURIComponent(token)}`;
}

const RESERVED_SPACE_SEGMENTS = new Set(["view", "invites"]);

/**
 * Rewrites legacy path-style space links (e.g. notification hrefs produced by
 * the backend) into their query-param equivalents. Other hrefs pass through.
 */
export function toAppSpaceHref(href: string): string {
  const match = /^\/spaces\/([^/?#]+)(?:\/([^/?#]+))?\/?(?:[?#].*)?$/.exec(href);
  if (!match) return href;
  const [, first, second] = match;
  if (first === "invites") {
    if (!second || second === "accept") return href;
    return spaceInviteHref(decodeURIComponent(second));
  }
  if (second || RESERVED_SPACE_SEGMENTS.has(first)) return href;
  return spaceHref(decodeURIComponent(first));
}
