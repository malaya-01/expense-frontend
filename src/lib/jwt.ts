function parseJwtPayload(token: string): { sub?: string; email?: string } | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as { sub?: string; email?: string };
  } catch {
    return null;
  }
}

export function userIdFromToken(token: string): string | null {
  return parseJwtPayload(token)?.sub ?? null;
}
