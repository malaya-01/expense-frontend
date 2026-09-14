export function describeVisionSource(
  provider?: string | null,
  model?: string | null,
): { provider: string; model: string; label: string } | null {
  const rawProvider = (provider || "").trim();
  const rawModel = (model || "").trim();
  if (!rawProvider && !rawModel) return null;

  let prettyProvider = rawProvider;
  let prettyModel = rawModel;

  if (/gemini/i.test(`${rawProvider} ${rawModel}`)) {
    prettyProvider = "Gemini";
    prettyModel = rawModel.match(/gemini-[\w.-]+/i)?.[0] || rawModel || "gemini-3.6-flash";
  } else if (/groq|qwen/i.test(`${rawProvider} ${rawModel}`)) {
    prettyProvider = "Groq";
    prettyModel =
      rawModel.match(/qwen\/[\w.-]+/i)?.[0] ||
      rawModel.replace(/^groq:/i, "") ||
      "qwen/qwen3.6-27b";
  } else if (/omniroute|opal/i.test(rawProvider)) {
    prettyProvider = "Opal Free";
  }

  prettyModel = prettyModel.replace(/^[^:]+:/, "").replace(/\/{2,}/g, "/");
  return {
    provider: prettyProvider || "Opal Free",
    model: prettyModel || "unknown",
    label: `${prettyProvider || "Opal Free"} · ${prettyModel || "unknown"}`,
  };
}
