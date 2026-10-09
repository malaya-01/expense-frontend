"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { offlineDb } from "@/lib/offline/db";
import { saveNotificationPreferences } from "@/lib/offline/repos";
import { runSync } from "@/lib/offline/sync-engine";
import {
  listConflicts,
  resolveKeepLocal,
  resolveKeepRemote,
} from "@/lib/offline/conflicts";
import type { ConflictItem } from "@/lib/offline/db";
import {
  api,
  getApiBaseUrl,
  isLocalhostApiUrl,
  setApiBaseUrl,
} from "@/lib/api/client";
import { canCrud } from "@/lib/permissions";
import { isNativeClient } from "@/lib/runtime-platform";
import { BUNDLE_VERSION } from "@/lib/native/live-update";
import { SettingRow, SettingsGroup, SwitchRow } from "./settings-ui";

type NotifPrefs = {
  budget_alerts: boolean;
  goal_reminders: boolean;
  recurring_due: boolean;
  sync_errors: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
  budget_alerts: true,
  goal_reminders: true,
  recurring_due: true,
  sync_errors: true,
};

const NOTIF_ITEMS: Array<[keyof NotifPrefs, string, string]> = [
  ["budget_alerts", "Budget alerts", "When a budget is close to or over its limit."],
  ["goal_reminders", "Goal reminders", "Nudges about savings goals and target dates."],
  ["recurring_due", "Recurring payments due", "Before a scheduled transaction runs."],
  ["sync_errors", "Sync problems", "When offline changes fail to sync."],
];

export const PRODUCTION_API = "https://expense-backend-2tg0.onrender.com/api";

/** In-app notification toggles (stored offline-first, synced). */
export function NotificationPreferencesCard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    if (!user?.id) return;
    void offlineDb.notification_preferences.get(user.id).then((row) => {
      if (row?.preferences && typeof row.preferences === "object") {
        setPrefs({ ...DEFAULT_PREFS, ...(row.preferences as NotifPrefs) });
      }
    });
  }, [user?.id]);

  async function toggle(key: keyof NotifPrefs, value: boolean) {
    if (!user?.id) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      await saveNotificationPreferences(user.id, next);
    } catch {
      setPrefs(prefs);
      showToast({
        title: "Could not save notification setting",
        tone: "error",
      });
    }
  }

  return (
    <SettingsGroup
      title="In-app notifications"
      description="Shown in the bell menu. Changes save automatically and sync when online."
    >
      {NOTIF_ITEMS.map(([key, label, description]) => (
        <SwitchRow
          key={key}
          id={`settings-notif-${key}`}
          label={label}
          description={description}
          checked={prefs[key]}
          onChange={(checked) => void toggle(key, checked)}
        />
      ))}
    </SettingsGroup>
  );
}

export function SyncSettingsSection() {
  const { user } = useAuth();
  const canSync = canCrud(user, "sync", "create");
  const { showToast } = useToast();
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [apiUrl, setApiUrl] = useState(PRODUCTION_API);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [native, setNative] = useState(false);

  useEffect(() => {
    setApiUrl(getApiBaseUrl());
    setNative(isNativeClient());
    void listConflicts().then(setConflicts);
  }, [user?.id]);

  async function saveAndTestApi() {
    setTesting(true);
    try {
      setApiBaseUrl(apiUrl);
      await api.get("/sync/status", { timeout: 90_000 });
      showToast({
        title: "API reachable",
        description: `Connected to ${getApiBaseUrl()}`,
        tone: "success",
      });
      void runSync("manual");
    } catch (err: unknown) {
      showToast({
        title: "Cannot reach API",
        description:
          (err as { message?: string })?.message ||
          "Check the URL and your network.",
        tone: "error",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsGroup
        title="Offline & sync"
        description="Opal keeps your data on this device and syncs changes when the network is available."
      >
        <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <p className="min-w-0 text-[12.5px] leading-5 text-[var(--ds-gray-700)]">
            Push pending changes and pull the latest from your account now.
          </p>
          <Button
            variant="secondary"
            loading={syncing}
            disabled={!canSync}
            onClick={async () => {
              if (!canSync) return;
              setSyncing(true);
              try {
                await runSync("manual");
                showToast({
                  title: "Sync complete",
                  description: "Pending changes were pushed and the latest pulled.",
                  tone: "success",
                });
              } finally {
                setSyncing(false);
              }
            }}
          >
            Sync now
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <p className="min-w-0 text-[12.5px] leading-5 text-[var(--ds-gray-700)]">
            Unsynced changes are also copied to a durable backup. After a
            reinstall, sign in with the same account to restore them.
          </p>
          <Button
            variant="secondary"
            onClick={async () => {
              if (!user?.id) return;
              const { persistDurableBackup, restoreDurableBackup } =
                await import("@/lib/offline/durable-backup");
              const restored = await restoreDurableBackup(user.id);
              await persistDurableBackup(user.id);
              showToast({
                title:
                  restored.restored > 0
                    ? `Restored ${restored.restored} pending change${restored.restored === 1 ? "" : "s"}`
                    : "Backup refreshed",
                description:
                  restored.restored > 0
                    ? "Unsynced items were recovered. Tap Sync now when online."
                    : "Current pending items are saved to the durable backup.",
                tone: "success",
              });
            }}
          >
            Refresh backup
          </Button>
        </div>
      </SettingsGroup>

      <SettingsGroup
        title="Sync conflicts"
        description="When the same item changed here and on another device, choose which version to keep."
        actions={
          <Badge tone={conflicts.length ? "warning" : "neutral"}>
            {conflicts.length} open
          </Badge>
        }
      >
        {conflicts.length === 0 ? (
          <p className="py-3.5 text-[12.5px] text-[var(--ds-gray-700)]">
            No conflicts right now.
          </p>
        ) : (
          conflicts.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <p className="min-w-0 truncate text-[12.5px] text-[var(--ds-gray-900)]">
                <span className="font-medium capitalize">
                  {String(c.entity_type).replace(/_/g, " ")}
                </span>{" "}
                <span className="font-mono text-[11px] text-[var(--ds-gray-700)]">
                  {c.entity_id}
                </span>
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    if (c.id == null) return;
                    await resolveKeepLocal(c.id);
                    setConflicts(await listConflicts());
                    void runSync("conflict-local");
                  }}
                >
                  Keep this device&apos;s
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (c.id == null) return;
                    await resolveKeepRemote(c.id);
                    setConflicts(await listConflicts());
                  }}
                >
                  Keep server&apos;s
                </Button>
              </div>
            </div>
          ))
        )}
      </SettingsGroup>

      {native ? (
        <SettingsGroup
          title="Server"
          description="The Opal API this app talks to. On Android it must be the live server — not localhost."
        >
          <SettingRow label="API base URL" htmlFor="settings-api-url" stacked>
            <Input
              id="settings-api-url"
              value={apiUrl}
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder={PRODUCTION_API}
              error={
                isLocalhostApiUrl(apiUrl)
                  ? "This points at localhost — your phone can't reach it."
                  : undefined
              }
            />
          </SettingRow>
          <div className="flex flex-wrap justify-end gap-2 py-3">
            <Button
              variant="secondary"
              onClick={() => {
                setApiUrl(PRODUCTION_API);
                setApiBaseUrl(PRODUCTION_API);
                showToast({
                  title: "Using the production server",
                  description: PRODUCTION_API,
                  tone: "success",
                });
              }}
            >
              Reset to default
            </Button>
            <Button loading={testing} onClick={() => void saveAndTestApi()}>
              Save & test
            </Button>
          </div>
        </SettingsGroup>
      ) : null}

      {native ? (
        <SettingsGroup
          title="App version"
          description="Updates download automatically and apply the next time you reopen the app."
        >
          <SettingRow label="Web bundle">
            <p className="font-mono text-[12.5px] text-[var(--ds-gray-900)] sm:text-right">
              {BUNDLE_VERSION}
            </p>
          </SettingRow>
        </SettingsGroup>
      ) : null}
    </div>
  );
}
