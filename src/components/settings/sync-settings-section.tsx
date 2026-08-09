"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const PRODUCTION_API = "https://expense-backend-2tg0.onrender.com/api";

export function SyncSettingsSection() {
  const { user } = useAuth();
  const canSync = canCrud(user, "sync", "create");
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [apiUrl, setApiUrl] = useState(PRODUCTION_API);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setApiUrl(getApiBaseUrl());
    if (!user?.id) return;
    void offlineDb.notification_preferences.get(user.id).then((row) => {
      if (row?.preferences && typeof row.preferences === "object") {
        setPrefs({ ...DEFAULT_PREFS, ...(row.preferences as NotifPrefs) });
      }
    });
    void listConflicts().then(setConflicts);
  }, [user?.id]);

  async function savePrefs() {
    if (!user?.id) return;
    setSaving(true);
    try {
      await saveNotificationPreferences(user.id, prefs);
      showToast({
        title: "Preferences saved",
        description: "Notification preferences will sync when online.",
        tone: "success",
      });
    } finally {
      setSaving(false);
    }
  }

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
    } catch (err: any) {
      showToast({
        title: "Cannot reach API",
        description: err?.message || "Check the URL and your network.",
        tone: "error",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-semibold">
            Server API URL
          </h2>
          <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
            On Android this must be your live Render backend — not localhost.
            {isLocalhostApiUrl(apiUrl) ? (
              <span className="mt-1 block text-[var(--ds-status-red)]">
                Current URL points at localhost. The phone cannot reach it.
              </span>
            ) : null}
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div>
            <Label htmlFor="api-url">API base URL</Label>
            <Input
              id="api-url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder={PRODUCTION_API}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button loading={testing} onClick={() => void saveAndTestApi()}>
              Save & test connection
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setApiUrl(PRODUCTION_API);
                setApiBaseUrl(PRODUCTION_API);
                showToast({
                  title: "Using production API",
                  description: PRODUCTION_API,
                  tone: "success",
                });
              }}
            >
              Use Render production
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-semibold">
            Offline & sync
          </h2>
          <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
            FinOS stores your finance data locally and syncs when the network is
            available.
          </p>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={!canSync}
            onClick={() => {
              if (!canSync) return;
              void runSync("manual").then(() =>
                showToast({
                  title: "Sync started",
                  description: "Pushing and pulling changes…",
                  tone: "success",
                }),
              );
            }}
          >
            Sync now
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-semibold">
            Unsynced data safety
          </h2>
          <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
            Pending changes are copied to a durable backup (device preferences +
            shared FinOS folder when allowed). After uninstall, reinstall and sign
            in with the same account to restore them. Once synced, that backup is
            removed. Best protection is still Sync now before removing the app.
          </p>
        </CardHeader>
        <CardBody>
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
            Restore / refresh durable backup
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-semibold">
            Notification preferences
          </h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {(
            [
              ["budget_alerts", "Budget alerts"],
              ["goal_reminders", "Goal reminders"],
              ["recurring_due", "Recurring due notices"],
              ["sync_errors", "Sync error notices"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 text-sm text-[var(--ds-gray-900)]"
            >
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, [key]: e.target.checked }))
                }
              />
              {label}
            </label>
          ))}
          <Button loading={saving} onClick={() => void savePrefs()}>
            Save preferences
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-semibold">
            Sync conflicts ({conflicts.length})
          </h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {conflicts.length === 0 ? (
            <p className="text-xs text-[var(--ds-gray-700)]">
              No conflicts right now.
            </p>
          ) : (
            conflicts.map((c) => (
              <div
                key={c.id}
                className="rounded-[6px] border border-[var(--ds-gray-200)] p-2"
              >
                <p className="text-xs text-[var(--ds-gray-900)]">
                  {c.entity_type} · {c.entity_id}
                </p>
                <div className="mt-2 flex gap-2">
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
                    Keep local
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
                    Keep remote
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
