export type AiErrorKind =
  | "rate_limit"
  | "credits"
  | "auth"
  | "model"
  | "overloaded"
  | "cancelled"
  | "network"
  | "generic";

export type AiErrorInfo = {
  kind: AiErrorKind;
  title: string;
  message: string;
  /** Softer tone for expected free-tier / quota issues */
  tone: "warn" | "error";
  showSettings: boolean;
  canRetry: boolean;
};

function normalizeRaw(error: unknown, fallback: string): string {
  if (typeof error === "string") return error.trim() || fallback;
  if (error instanceof Error) return error.message.trim() || fallback;
  return fallback;
}

/** Map provider / stream failures into calm, actionable UI copy. */
export function humanizeAiProviderError(
  error: unknown,
  fallback = "Advisor request failed",
): AiErrorInfo {
  const raw = normalizeRaw(error, fallback);
  const lower = raw.toLowerCase();

  if (/abort|cancel/i.test(lower) && /request|stream|advisor/i.test(lower)) {
    return {
      kind: "cancelled",
      title: "Stopped",
      message: "The reply was cancelled. Send again whenever you’re ready.",
      tone: "warn",
      showSettings: false,
      canRetry: true,
    };
  }

  if (
    /omniroute_daily_limit|daily free omniroute|omniroute limit|20 successful/.test(
      lower,
    )
  ) {
    return {
      kind: "rate_limit",
      title: "Free Opal Free limit reached",
      message:
        "You’ve used today’s 20 free Opal Free replies. Resets at UTC midnight — or connect OpenRouter / your own key in Settings → AI for unlimited use.",
      tone: "warn",
      showSettings: true,
      canRetry: false,
    };
  }

  if (
    /rate.?limit|too many requests|free-models-per-day|free.?tier|free daily|quota.?exceeded|429/.test(
      lower,
    )
  ) {
    return {
      kind: "rate_limit",
      title: "Daily free limit reached",
      message:
        "A free-tier allowance is used up for now. Wait for it to reset, switch OmniRoute model (auto fails over), or connect a BYOK provider in Settings → AI.",
      tone: "warn",
      showSettings: true,
      canRetry: true,
    };
  }

  if (
    /insufficient.?credits|payment.?required|add.?credits|billing|credit.?balance|out of credits|402/.test(
      lower,
    )
  ) {
    return {
      kind: "credits",
      title: "Credits required",
      message:
        "This model needs OpenRouter credits. Add credits, or choose a free model in Settings → AI, then try again.",
      tone: "warn",
      showSettings: true,
      canRetry: true,
    };
  }

  if (
    /invalid.?api.?key|unauthorized|forbidden|authentication|rejected the api key|401|403/.test(
      lower,
    )
  ) {
    return {
      kind: "auth",
      title: "API key issue",
      message:
        "The provider rejected your key. Open Settings → AI, re-paste the key, run Test, then retry.",
      tone: "error",
      showSettings: true,
      canRetry: false,
    };
  }

  if (/model.?not.?found|no such model|does not exist|unknown model|404/.test(lower)) {
    return {
      kind: "model",
      title: "Model unavailable",
      message:
        "That model isn’t available right now. Pick another one in Settings → AI — free OpenRouter models often end with :free.",
      tone: "warn",
      showSettings: true,
      canRetry: false,
    };
  }

  if (/overloaded|temporarily unavailable|capacity|503|502/.test(lower)) {
    return {
      kind: "overloaded",
      title: "Provider busy",
      message:
        "The model provider is temporarily overloaded. Wait a minute and retry, or switch models.",
      tone: "warn",
      showSettings: true,
      canRetry: true,
    };
  }

  if (
    /cannot reach|network|failed to fetch|econnrefused|timeout|awake/i.test(lower)
  ) {
    return {
      kind: "network",
      title: "Connection problem",
      message: raw,
      tone: "error",
      showSettings: false,
      canRetry: true,
    };
  }

  // Prefer backend-crafted friendly sentences as-is when present.
  if (
    /openrouter|openai|anthropic|vertex|local model|settings → ai/i.test(raw) &&
    raw.length < 320
  ) {
    const kind: AiErrorKind = /limit|credit|free/i.test(raw)
      ? "rate_limit"
      : "generic";
    return {
      kind,
      title: kind === "rate_limit" ? "Provider limit" : "Couldn’t get a reply",
      message: raw.replace(/^provider error \([^)]+\):\s*/i, ""),
      tone: kind === "rate_limit" ? "warn" : "error",
      showSettings: true,
      canRetry: true,
    };
  }

  return {
    kind: "generic",
    title: "Couldn’t get a reply",
    message:
      raw.replace(/^provider error \([^)]+\):\s*/i, "").slice(0, 280) ||
      fallback,
    tone: "error",
    showSettings: true,
    canRetry: true,
  };
}
