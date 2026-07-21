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

const PROVIDER_ORDER: AiProviderId[] = [
  "openai",
  "anthropic",
  "local",
  "vertex",
];

const PROVIDER_LABEL: Record<AiProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  local: "Local model",
  vertex: "Google Vertex AI",
};

const PROVIDER_TONE: Record<AiProviderId, "blue" | "orange" | "purple" | "green"> = {
  openai: "green",
  anthropic: "orange",
  local: "purple",
  vertex: "blue",
};

export function AiProvidersSection() {
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

  const refresh = async () => {
    setLoading(true);
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
      if (!result.ok) setError(result.message);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Connection test failed"));
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
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2>AI &amp; models</h2>
              <InfoTip title="Bring your own key">
                <p>
                  FinOS never stores provider keys in the browser. Keys and Vertex
                  JSON are encrypted on the server. Pick one active provider for
                  the Advisor.
                </p>
              </InfoTip>
            </div>
            <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
              Active:{" "}
              {settings?.active_provider
                ? `${PROVIDER_LABEL[settings.active_provider]} · ${settings.active_model || "default model"}`
                : "None selected"}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setPromptOpen(true)}>
            Master prompt
          </Button>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          {providers.map((p) => {
            const active = settings?.active_provider === p.provider;
            const guide = p.setup || settings?.setup_guides?.[p.provider];
            return (
              <div
                key={p.provider}
                className={cn(
                  "ai-provider-card rounded-[12px] p-4",
                  active
                    ? "ring-2 ring-[var(--ds-focus-color)] ring-offset-2 ring-offset-[var(--ds-background-100)]"
                    : "",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusDot tone={PROVIDER_TONE[p.provider]} />
                    <div>
                      <p className="text-sm text-[var(--ds-gray-1000)]">
                        {PROVIDER_LABEL[p.provider]}
                      </p>
                      <p className="text-xs text-[var(--ds-gray-700)]">
                        {p.connected
                          ? `Ready · ${p.model || "model"}`
                          : "Not connected"}
                      </p>
                    </div>
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
                            className="block text-[var(--ds-focus-color)]"
                          >
                            {link.label} ↗
                          </a>
                        ))}
                      </div>
                    </InfoTip>
                  ) : null}
                </div>

                {p.credentials_meta?.api_key_masked ? (
                  <p className="mt-3 font-mono text-[11px] text-[var(--ds-gray-700)]">
                    Key {p.credentials_meta.api_key_masked}
                  </p>
                ) : null}
                {p.credentials_meta?.service_account_email ? (
                  <p className="mt-3 truncate text-[11px] text-[var(--ds-gray-700)]">
                    SA {p.credentials_meta.service_account_email}
                  </p>
                ) : null}
                {p.last_test_message ? (
                  <p
                    className={cn(
                      "mt-2 text-[11px]",
                      p.last_test_status === "ok"
                        ? "text-[var(--ds-status-green)]"
                        : "text-[var(--ds-gray-700)]",
                    )}
                  >
                    {p.last_test_message}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setConfigure(p.provider)}
                  >
                    Configure
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === `test-${p.provider}`}
                    disabled={!p.connected && !p.credentials_meta?.has_api_key && !p.credentials_meta?.has_service_account}
                    onClick={() => onTest(p.provider)}
                  >
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === `use-${p.provider}`}
                    disabled={!p.connected && !p.model}
                    onClick={() => onUse(p.provider, p.model)}
                  >
                    Use
                  </Button>
                  {(p.connected ||
                    p.credentials_meta?.has_api_key ||
                    p.credentials_meta?.has_service_account) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[var(--ds-status-red)]"
                      loading={busy === `disc-${p.provider}`}
                      onClick={() => setDisconnectTarget(p.provider)}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card className="ds-strong-border">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <h2>Memory &amp; chat continuity</h2>
            <p className="mt-1 max-w-2xl text-xs leading-4 text-[var(--ds-gray-700)]">
              FinOS uses recent chat history and these durable facts across new
              conversations. You can also say “Remember that …” in chat.
            </p>
          </div>
          <Button
            size="sm"
            variant={memoryEnabled ? "secondary" : "primary"}
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
              disabled={!memoryEnabled || !memoryDraft.trim()}
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
                    onClick={async () => {
                      await deleteAiMemory(memory.id);
                      setMemories((items) =>
                        items.filter((item) => item.id !== memory.id),
                      );
                    }}
                    className="shrink-0 rounded px-1.5 py-0.5 text-xs text-[var(--ds-status-red)] hover:bg-[var(--ds-danger-hover)]"
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
              Load FinOS default
            </Button>
            <Button loading={busy === "prompt"} onClick={savePrompt}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs leading-4 text-[var(--ds-gray-700)]">
            FinOS layers prompts as: protected safety rules + FinOS Personal CFO
            default (from the product vision) + your optional customization.
            Leave customization empty to use the FinOS default as-is.
          </p>

          <div>
            <Label>Protected safety layer</Label>
            <div className="mt-1 max-h-24 overflow-auto rounded-[8px] bg-[var(--ds-background-100)] p-3 text-[11px] leading-4 text-[var(--ds-gray-700)] ds-strong-border">
              {settings?.safety_layer_preview}
            </div>
          </div>

          <div>
            <Label>FinOS default (Personal Financial Operating System)</Label>
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
              placeholder="Add personal coaching preferences, or click Load FinOS default to edit the full product prompt."
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
            ? `${PROVIDER_LABEL[disconnectTarget]} credentials will be permanently removed from FinOS.`
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
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(
    existing?.base_url || "http://127.0.0.1:11434/v1",
  );
  const [projectId, setProjectId] = useState(existing?.project_id || "");
  const [location, setLocation] = useState(existing?.location || "us-central1");
  const [saJson, setSaJson] = useState("");
  const [saFileName, setSaFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listAiModels(provider)
      .then((r) => {
        const valid = r.models.filter((item) => item && item !== "default");
        setModels(valid);
        if ((!model || model === "default") && valid[0]) setModel(valid[0]);
      })
      .catch(() => {
        /* defaults already set */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

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
      await upsertAiProvider({
        provider,
        model: model || undefined,
        api_key: apiKey || undefined,
        base_url: provider === "local" || provider === "openai" ? baseUrl : undefined,
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

  return (
    <Modal
      open
      onClose={onClose}
      title={`Configure ${PROVIDER_LABEL[provider]}`}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button form="provider-form" type="submit" loading={loading}>
            Save
          </Button>
        </>
      }
    >
      <form id="provider-form" onSubmit={onSubmit} className="space-y-4">
        {guide ? (
          <div className="rounded-[8px] bg-[var(--ds-background-100)] p-3 text-xs leading-4 text-[var(--ds-gray-900)]">
            <p className="font-medium text-[var(--ds-gray-1000)]">{guide.summary}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              {guide.steps.slice(0, 4).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        ) : null}

        <div>
          <Label htmlFor="model">Model</Label>
          <Select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {(models.length ? models : [model]).filter(Boolean).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
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

        {provider !== "vertex" ? (
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
                    : "Paste secret key"
              }
            />
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
                Project ID is read from the file. The JSON is sent only to FinOS
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
