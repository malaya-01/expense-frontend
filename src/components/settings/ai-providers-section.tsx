"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusDot } from "@/components/ui/status-dot";
import { InfoTip } from "@/components/ui/popover";
import { getErrorMessage } from "@/lib/api/client";
import {
  addAiMemory,
  deleteAiMemory,
  disconnectAiProvider,
  getAiMemories,
  getAiSettings,
  listAiModels,
  selectActiveAiProvider,
  setAiMemoryEnabled,
  testAiProvider,
  updateMasterPrompt,
  upsertAiProvider,
} from "@/lib/api/ai";
import type {
  AiMemory,
  AiProviderConfigPublic,
  AiProviderId,
  AiSettings,
} from "@/types";
import { cn } from "@/lib/cn";
import { useModulePermissions } from "@/components/permissions/permission-gate";

const PROVIDER_ORDER: AiProviderId[] = [
  "omniroute",
  "openrouter",
  "openai",
  "anthropic",
  "local",
  "vertex",
];

const PROVIDER_LABEL: Record<AiProviderId, string> = {
  omniroute: "Opal Free",
  openrouter: "OpenRouter",
  openai: "OpenAI",
  anthropic: "Anthropic",
  local: "Local model",
  vertex: "Google Vertex AI",
};

const PROVIDER_TONE: Record<
  AiProviderId,
  "blue" | "orange" | "purple" | "green" | "cyan"
> = {
  omniroute: "green",
  openrouter: "cyan",
  openai: "green",
  anthropic: "orange",
  local: "purple",
  vertex: "blue",
};

export function AiProvidersSection() {
  const perms = useModulePermissions("ai");
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [configure, setConfigure] = useState<AiProviderId | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptDraft, setPromptDraft] = useState("");
  const [memories, setMemories] = useState<AiMemory[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [memoryDraft, setMemoryDraft] = useState("");
  const [disconnectTarget, setDisconnectTarget] =
    useState<AiProviderId | null>(null);
  const [testNotes, setTestNotes] = useState<
    Partial<Record<AiProviderId, { ok: boolean; message: string }>>
  >({});

  const refresh = async () => {
    if (!settings) setLoading(true);
    setError("");
    try {
      const [data, memory] = await Promise.all([
        getAiSettings(),
        getAiMemories(),
      ]);
      setSettings(data);
      setPromptDraft(data.master_prompt || "");
      setMemories(memory.memories);
      setMemoryEnabled(memory.enabled);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load AI settings"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const providers = useMemo(() => {
    const map = new Map(
      (settings?.providers || []).map((p) => [p.provider, p]),
    );
    return PROVIDER_ORDER.map(
      (id) =>
        map.get(id) ||
        ({
          provider: id,
          connected: false,
          model: null,
          setup: settings?.setup_guides?.[id],
        } as AiProviderConfigPublic),
    );
  }, [settings]);

  async function onUse(provider: AiProviderId, model?: string | null) {
    setBusy(`use-${provider}`);
    setError("");
    try {
      if (provider === "omniroute") {
        const result = await testAiProvider(provider);
        setTestNotes((prev) => ({
          ...prev,
          omniroute: {
            ok: Boolean(result.ok),
            message:
              result.message ||
              (result.ok ? "Free route ready" : "Connection check failed"),
          },
        }));
        if (!result.ok) {
          throw new Error(
            result.message ||
              "Free route could not connect. Try again or use OpenRouter.",
          );
        }
      }
      await selectActiveAiProvider({
        provider,
        model: model || undefined,
      });
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not select provider"));
    } finally {
      setBusy(null);
    }
  }

  async function onTest(provider: AiProviderId) {
    setBusy(`test-${provider}`);
    setError("");
    try {
      const result = await testAiProvider(provider);
      setTestNotes((prev) => ({
        ...prev,
        [provider]: {
          ok: Boolean(result.ok),
          message: result.message || (result.ok ? "Connection ok" : "Test failed"),
        },
      }));
      await refresh();
    } catch (err) {
      const message = getErrorMessage(err, "Connection test failed");
      setTestNotes((prev) => ({
        ...prev,
        [provider]: { ok: false, message },
      }));
      setError(message);
    } finally {
      setBusy(null);
    }
  }

  async function onDisconnect(provider: AiProviderId) {
    setBusy(`disc-${provider}`);
    try {
      await disconnectAiProvider(provider);
      setDisconnectTarget(null);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not disconnect"));
    } finally {
      setBusy(null);
    }
  }

  async function savePrompt() {
    setBusy("prompt");
    try {
      await updateMasterPrompt(promptDraft);
      setPromptOpen(false);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save master prompt"));
    } finally {
      setBusy(null);
    }
  }

  async function saveMemory(e: FormEvent) {
    e.preventDefault();
    const content = memoryDraft.trim();
    if (!content) return;
    setBusy("memory");
    setError("");
    try {
      await addAiMemory(content);
      setMemoryDraft("");
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save memory"));
    } finally {
      setBusy(null);
    }
  }

  if (loading && !settings) {
    return <p className="text-sm text-[var(--ds-gray-900)]">Loading AI settings…</p>;
  }

  return (
    <div className="space-y-4">
      {!settings?.encryption_ready ? (
        <Card>
          <CardBody className="pt-5 text-sm text-[var(--ds-status-orange)]">
            Server is missing <code>AI_CREDENTIALS_ENCRYPTION_KEY</code>. Ask your
            admin to set it before saving provider keys.
          </CardBody>
        </Card>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--ds-status-red)]">{error}</p>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm sm:text-base">AI &amp; models</h2>
              <InfoTip title="Opal Free + optional BYOK">
                <p>
                  Start with Opal Free — no API key for you. The server uses
                  Groq (very fast) or Gemini when configured, otherwise built-in
                  Opal Advisor. For unlimited use, connect OpenRouter or another
                  bring-your-own-key provider. Keys are encrypted on the server.
                </p>
              </InfoTip>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-[var(--ds-gray-700)] sm:text-xs">
              Active:{" "}
              {settings?.active_provider
                ? `${PROVIDER_LABEL[settings.active_provider]} · ${settings.active_model || "default model"}`
                : "None — use Opal Free to start"}
              {settings?.omniroute_quota
                ? ` · Free today ${settings.omniroute_quota.used}/${settings.omniroute_quota.limit}`
                : ""}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setPromptOpen(true)}>
            Prompt
          </Button>
        </CardHeader>
        <CardBody className="grid gap-2 sm:grid-cols-2">
          {providers.map((p) => {
            const active = settings?.active_provider === p.provider;
            const guide = p.setup || settings?.setup_guides?.[p.provider];
            const testNote =
              testNotes[p.provider] ||
              (p.last_test_message
                ? {
                    ok: p.last_test_status === "ok",
                    message: p.last_test_message,
                  }
                : null);
            return (
              <div
                key={p.provider}
                className={cn(
                  "ai-provider-card min-w-0 rounded-[10px] px-3 py-2.5",
                  active &&
                    "ring-2 ring-[var(--ds-focus-color)] ring-offset-1 ring-offset-[var(--ds-background-elevated)]",
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <StatusDot tone={PROVIDER_TONE[p.provider]} />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-[var(--ds-gray-1000)]">
                        {PROVIDER_LABEL[p.provider]}
                      </p>
                      {(p.recommended || p.provider === "omniroute") && (
                        <span className="shrink-0 rounded-[4px] bg-[color:color-mix(in_srgb,var(--ds-focus-color)_16%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--ds-focus-color)]">
                          {p.provider === "omniroute" ? "Free" : "Recommended"}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-[var(--ds-gray-700)]">
                      {p.provider === "omniroute"
                        ? p.daily_quota
                          ? `Free · ${p.daily_quota.remaining}/${p.daily_quota.limit} left today · ${p.model || "auto"}`
                          : `Free · no key · ${p.model || "auto"}`
                        : p.connected
                          ? `Ready · ${p.model || "model"}`
                          : p.provider === "openrouter"
                            ? "One key · hundreds of models"
                            : "Not connected"}
                    </p>
                  </div>
                  {guide ? (
                    <InfoTip title={`How to connect ${guide.title}`}>
                      <p>{guide.summary}</p>
                      <ol className="list-decimal space-y-1 pl-4">
                        {guide.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                      <div className="space-y-1 pt-1">
                        {guide.links.map((link) => (
                          <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="link-accent block"
                          >
                            {link.label} ↗
                          </a>
                        ))}
                      </div>
                    </InfoTip>
                  ) : null}
                </div>

                <div className="mt-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 min-w-0 flex-1 px-2 text-[11px]"
                    disabled={!perms.create && !perms.update}
                    onClick={() => setConfigure(p.provider)}
                  >
                    Configure
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 min-w-0 flex-1 px-2 text-[11px]"
                    loading={busy === `test-${p.provider}`}
                    disabled={
                      !perms.create ||
                      (p.provider !== "omniroute" &&
                        !p.connected &&
                        !p.credentials_meta?.has_api_key &&
                        !p.credentials_meta?.has_service_account)
                    }
                    onClick={() => onTest(p.provider)}
                  >
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 min-w-0 flex-1 px-2 text-[11px]"
                    loading={busy === `use-${p.provider}`}
                    disabled={
                      !perms.create ||
                      (p.provider !== "omniroute" && !p.connected && !p.model)
                    }
                    onClick={() => onUse(p.provider, p.model)}
                  >
                    {p.provider === "omniroute" ? "Use free" : "Use"}
                  </Button>
                  {p.provider !== "omniroute" &&
                    (p.connected ||
                      p.credentials_meta?.has_api_key ||
                      p.credentials_meta?.has_service_account) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 shrink-0 px-2 text-[11px] text-[var(--ds-status-red)]"
                      loading={busy === `disc-${p.provider}`}
                      disabled={!perms.delete}
                      onClick={() => setDisconnectTarget(p.provider)}
                    >
                      Off
                    </Button>
                  )}
                </div>
                {testNote ? (
                  <p
                    className={cn(
                      "mt-2 break-words text-[11px] leading-4",
                      testNote.ok
                        ? "text-[var(--ds-status-green)]"
                        : "text-[var(--ds-status-red)]",
                    )}
                  >
                    {testNote.ok ? "Passed · " : "Failed · "}
                    {testNote.message}
                  </p>
                ) : null}
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card className="ds-strong-border">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm sm:text-base">Memory &amp; chat</h2>
            <p className="mt-0.5 hidden max-w-2xl text-xs leading-4 text-[var(--ds-gray-700)] sm:block">
              Recent chat plus these facts carry into new conversations. You can
              also say “Remember that …” in chat.
            </p>
          </div>
          <Button
            size="sm"
            variant={memoryEnabled ? "secondary" : "primary"}
            className="h-7 shrink-0 px-2.5 text-[11px]"
            disabled={!perms.update}
            onClick={async () => {
              const next = !memoryEnabled;
              setMemoryEnabled(next);
              try {
                await setAiMemoryEnabled(next);
              } catch (err) {
                setMemoryEnabled(!next);
                setError(getErrorMessage(err, "Could not update memory"));
              }
            }}
          >
            Memory {memoryEnabled ? "on" : "off"}
          </Button>
        </CardHeader>
        <CardBody className="space-y-3">
          <form onSubmit={saveMemory} className="flex gap-2">
            <Input
              value={memoryDraft}
              onChange={(event) => setMemoryDraft(event.target.value)}
              placeholder="e.g. I prefer conservative budgets and save for a home"
              maxLength={1000}
              disabled={!memoryEnabled}
            />
            <Button
              type="submit"
              loading={busy === "memory"}
              disabled={!perms.create || !memoryEnabled || !memoryDraft.trim()}
            >
              Remember
            </Button>
          </form>
          {memories.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="flex items-start justify-between gap-3 rounded-[8px] bg-[var(--ds-background-100)] p-3 ds-strong-border"
                >
                  <div>
                    <p className="text-xs leading-4 text-[var(--ds-gray-1000)]">
                      {memory.content}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--ds-gray-700)]">
                      {memory.source === "conversation" ? "From chat" : "Added by you"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!perms.delete}
                    onClick={async () => {
                      if (!perms.delete) return;
                      await deleteAiMemory(memory.id);
                      setMemories((items) =>
                        items.filter((item) => item.id !== memory.id),
                      );
                    }}
                    className="shrink-0 rounded px-1.5 py-0.5 text-xs text-[var(--ds-status-red)] hover:bg-[var(--ds-danger-hover)] disabled:opacity-40"
                    aria-label="Forget memory"
                  >
                    Forget
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--ds-gray-700)]">
              No durable memories yet. Chat history remains available in the
              Advisor conversation rail.
            </p>
          )}
        </CardBody>
      </Card>

      {configure ? (
        <ProviderConfigureModal
          provider={configure}
          existing={providers.find((p) => p.provider === configure) || null}
          onClose={() => setConfigure(null)}
          onSaved={async () => {
            setConfigure(null);
            await refresh();
          }}
        />
      ) : null}

      <Modal
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        title="Master prompt"
        className="max-w-3xl"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setPromptDraft("");
              }}
            >
              Clear customization
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPromptDraft(settings?.master_prompt_default || "");
              }}
            >
              Load Opal default
            </Button>
            <Button
              loading={busy === "prompt"}
              disabled={!perms.update}
              onClick={savePrompt}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs leading-4 text-[var(--ds-gray-700)]">
            Opal layers prompts as: protected safety rules + Opal Personal CFO
            default (from the product vision) + your optional customization.
            Leave customization empty to use the Opal default as-is.
          </p>

          <div>
            <Label>Protected safety layer</Label>
            <div className="mt-1 max-h-24 overflow-auto rounded-[8px] bg-[var(--ds-background-100)] p-3 text-[11px] leading-4 text-[var(--ds-gray-700)] ds-strong-border">
              {settings?.safety_layer_preview}
            </div>
          </div>

          <div>
            <Label>Opal default (Personal Financial Operating System)</Label>
            <div className="mt-1 max-h-40 overflow-auto rounded-[8px] bg-[var(--ds-background-100)] p-3 text-[11px] leading-4 whitespace-pre-wrap text-[var(--ds-gray-900)] ds-strong-border">
              {settings?.master_prompt_default}
            </div>
          </div>

          <div>
            <Label htmlFor="master-prompt">Your customization (optional)</Label>
            <Textarea
              id="master-prompt"
              value={promptDraft}
              onChange={(e) => setPromptDraft(e.target.value)}
              placeholder="Add personal coaching preferences, or click Load Opal default to edit the full product prompt."
              className="min-h-[180px]"
            />
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={Boolean(disconnectTarget)}
        title="Disconnect AI provider?"
        description={
          disconnectTarget
            ? `${PROVIDER_LABEL[disconnectTarget]} credentials will be permanently removed from Opal.`
            : undefined
        }
        confirmLabel="Disconnect provider"
        destructive
        busy={
          disconnectTarget ? busy === `disc-${disconnectTarget}` : false
        }
        onClose={() => setDisconnectTarget(null)}
        onConfirm={() =>
          disconnectTarget ? onDisconnect(disconnectTarget) : undefined
        }
      />
    </div>
  );
}

function ProviderConfigureModal({
  provider,
  existing,
  onClose,
  onSaved,
}: {
  provider: AiProviderId;
  existing: AiProviderConfigPublic | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [model, setModel] = useState(existing?.model || "");
  const [models, setModels] = useState<string[]>(existing?.default_models || []);
  const [modelFilter, setModelFilter] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(
    existing?.base_url ||
      (provider === "openrouter"
        ? "https://openrouter.ai/api/v1"
        : "http://127.0.0.1:11434/v1"),
  );
  const [projectId, setProjectId] = useState(existing?.project_id || "");
  const [location, setLocation] = useState(existing?.location || "us-central1");
  const [saJson, setSaJson] = useState("");
  const [saFileName, setSaFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelsSource, setModelsSource] = useState("defaults");

  useEffect(() => {
    listAiModels(provider)
      .then((r) => {
        const valid = r.models.filter((item) => item && item !== "default");
        setModels(valid);
        setModelsSource(r.source || "defaults");
        if ((!model || model === "default") && valid[0]) setModel(valid[0]);
      })
      .catch(() => {
        /* defaults already set */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const filteredModels = useMemo(() => {
    const q = modelFilter.trim().toLowerCase();
    const list = models.length ? models : [model].filter(Boolean);
    if (!q) return list;
    return list.filter((m) => m.toLowerCase().includes(q));
  }, [models, model, modelFilter]);

  const modelOptions = useMemo(() => {
    const list = [...filteredModels];
    if (model && !list.includes(model)) list.unshift(model);
    return list.filter(Boolean);
  }, [filteredModels, model]);

  const resolvedModel = (customModel.trim() || model).trim();

  async function onServiceAccountFile(file?: File) {
    if (!file) return;
    setError("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        type?: string;
        project_id?: string;
        client_email?: string;
      };
      if (
        parsed.type !== "service_account" ||
        !parsed.project_id ||
        !parsed.client_email
      ) {
        throw new Error("Choose a valid Google service-account JSON file.");
      }
      setSaJson(text);
      setSaFileName(file.name);
      setProjectId(parsed.project_id);
      if (!location) setLocation("us-central1");
    } catch (err) {
      setSaJson("");
      setSaFileName("");
      setError(getErrorMessage(err, "Could not read service-account JSON"));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!resolvedModel) {
        throw new Error("Choose or enter a model.");
      }
      if (provider === "omniroute") {
        await upsertAiProvider({
          provider: "omniroute",
          model: resolvedModel,
        });
        const result = await testAiProvider("omniroute");
        if (!result.ok) {
          throw new Error(
            result.message ||
              "Free route could not connect. Try again shortly.",
          );
        }
        await selectActiveAiProvider({
          provider: "omniroute",
          model: resolvedModel,
        });
        await onSaved();
        return;
      }
      await upsertAiProvider({
        provider,
        model: resolvedModel,
        api_key: apiKey || undefined,
        base_url:
          provider === "local" || provider === "openai" ? baseUrl : undefined,
        project_id: provider === "vertex" ? projectId || undefined : undefined,
        location: provider === "vertex" ? location || undefined : undefined,
        service_account_json:
          provider === "vertex" && saJson ? saJson : undefined,
      });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save provider"));
    } finally {
      setLoading(false);
    }
  }

  const guide = existing?.setup;
  const isOpenRouter = provider === "openrouter";
  const isOmniroute = provider === "omniroute";

  return (
    <Modal
      open
      onClose={onClose}
      title={
        isOmniroute
          ? "Opal Free models"
          : `Configure ${PROVIDER_LABEL[provider]}`
      }
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button form="provider-form" type="submit" loading={loading}>
            {isOmniroute ? "Use free AI" : "Save"}
          </Button>
        </>
      }
    >
      <form id="provider-form" onSubmit={onSubmit} className="space-y-4">
        {guide ? (
          <div className="rounded-[8px] bg-[var(--ds-background-100)] p-3 text-xs leading-4 text-[var(--ds-gray-900)]">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-[var(--ds-gray-1000)]">
                {guide.summary}
              </p>
              {isOmniroute || isOpenRouter ? (
                <span className="rounded-[4px] bg-[color:color-mix(in_srgb,var(--ds-focus-color)_16%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--ds-focus-color)]">
                  {isOmniroute ? "No signup" : "Recommended"}
                </span>
              ) : null}
            </div>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              {guide.steps.slice(0, 4).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            {isOmniroute && existing?.daily_quota ? (
              <p className="mt-2 text-[var(--ds-gray-700)]">
                Today: {existing.daily_quota.used}/{existing.daily_quota.limit}{" "}
                successful requests used ({existing.daily_quota.remaining} left).
              </p>
            ) : null}
            {isOpenRouter ? (
              <p className="mt-2 text-[11px] text-[var(--ds-gray-700)]">
                Docs:{" "}
                <a
                  href="https://openrouter.ai/docs/quickstart"
                  target="_blank"
                  rel="noreferrer"
                  className="link-accent"
                >
                  openrouter.ai/docs/quickstart
                </a>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <Label htmlFor="model">Model</Label>
            {isOpenRouter ? (
              <a
                href="https://openrouter.ai/models"
                target="_blank"
                rel="noreferrer"
                className="link-accent text-[11px]"
              >
                Browse catalog ↗
              </a>
            ) : null}
          </div>

          {isOpenRouter || models.length > 12 ? (
            <Input
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              placeholder="Filter models…"
              aria-label="Filter models"
            />
          ) : null}

          <Select
            id="model"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setCustomModel("");
            }}
          >
            {modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>

          {isOpenRouter ? (
            <div>
              <Label htmlFor="custom-model">
                Custom model slug (optional)
              </Label>
              <Input
                id="custom-model"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="e.g. anthropic/claude-sonnet-4 or openai/gpt-4o"
                className="mt-1 font-mono text-xs"
              />
              <p className="mt-1.5 text-[11px] text-[var(--ds-gray-700)]">
                OpenRouter uses <code>provider/model</code> slugs. Leave blank to
                use the selection above
                {modelsSource === "provider"
                  ? " (list refreshed from your key)."
                  : "."}
                {resolvedModel ? (
                  <>
                    {" "}
                    Saving as <code>{resolvedModel}</code>.
                  </>
                ) : null}
              </p>
            </div>
          ) : null}
        </div>

        {provider === "local" || provider === "openai" ? (
          <div>
            <Label htmlFor="base-url">Base URL</Label>
            <Input
              id="base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={
                provider === "local"
                  ? "http://127.0.0.1:11434/v1"
                  : "https://api.openai.com/v1"
              }
            />
          </div>
        ) : null}

        {provider !== "vertex" && !isOmniroute ? (
          <div>
            <Label htmlFor="api-key">
              API key
              {existing?.credentials_meta?.api_key_masked
                ? ` (saved ${existing.credentials_meta.api_key_masked})`
                : ""}
            </Label>
            <Input
              id="api-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                existing?.credentials_meta?.has_api_key
                  ? "Leave blank to keep saved key"
                  : provider === "local"
                    ? "Optional for many local servers"
                    : isOpenRouter
                      ? "Paste OpenRouter key (sk-or-…)"
                      : "Paste secret key"
              }
            />
            {isOpenRouter ? (
              <p className="mt-1.5 text-[11px] text-[var(--ds-gray-700)]">
                Create a key at{" "}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="link-accent"
                >
                  openrouter.ai/keys
                </a>
                . Keys are encrypted on the server, never stored in the browser.
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="project">Project ID</Label>
                <Input
                  id="project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="my-gcp-project"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="us-central1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="sa-file">Service-account JSON file</Label>
              <label
                htmlFor="sa-file"
                className="mt-1 flex cursor-pointer items-center justify-between gap-3 rounded-[8px] bg-[var(--ds-background-100)] px-3 py-3 text-sm text-[var(--ds-gray-1000)] ds-strong-border"
              >
                <span className="truncate">
                  {saFileName ||
                    (existing?.credentials_meta?.has_service_account
                      ? "Credential already saved"
                      : "Choose JSON file")}
                </span>
                <span className="rounded-[6px] bg-[var(--ds-gray-1000)] px-3 py-1.5 text-xs text-[var(--ds-primary-foreground)]">
                  Browse
                </span>
              </label>
              <input
                id="sa-file"
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={(event) =>
                  void onServiceAccountFile(event.target.files?.[0])
                }
              />
              <p className="mt-1.5 text-[11px] text-[var(--ds-gray-700)]">
                Project ID is read from the file. The JSON is sent only to Opal
                and encrypted server-side.
              </p>
            </div>
            <div>
              <Label htmlFor="sa">JSON preview (optional paste)</Label>
              <Textarea
                id="sa"
                value={saJson}
                onChange={(e) => setSaJson(e.target.value)}
                placeholder={
                  existing?.credentials_meta?.has_service_account
                    ? "Leave blank to keep uploaded JSON"
                    : '{ "type": "service_account", ... }'
                }
                className="min-h-[120px] font-mono text-xs"
              />
            </div>
          </>
        )}

        {error ? (
          <p className="text-sm text-[var(--ds-status-red)]">{error}</p>
        ) : null}
      </form>
    </Modal>
  );
}
