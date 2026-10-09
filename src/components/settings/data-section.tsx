"use client";

import { useEffect, useState } from "react";
import { Download, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { saveTextFile } from "@/components/native/save-file";
import { useAuth } from "@/lib/auth-context";
import { getApiBaseUrl } from "@/lib/api/client";
import { listAccounts } from "@/lib/api/accounts";
import { listTransactions } from "@/lib/api/transactions";
import { listBudgets } from "@/lib/api/budgets";
import { listGoals } from "@/lib/api/goals";
import { listInvestments } from "@/lib/api/investments";
import { listCategories } from "@/lib/api/categories";
import { APP_NAME, APP_SLUG, APP_VERSION } from "@/lib/brand";
import { countPendingOutbox } from "@/lib/offline/outbox";
import { clearOfflineTables, switchOfflineUser } from "@/lib/offline/clear-session";
import { invalidateHydrate, notifyDataUpdated } from "@/lib/offline/hydrate-cache";
import { runSync } from "@/lib/offline/sync-engine";
import { DISMISSED_NOTIFICATIONS_KEY } from "@/lib/store/slices/notificationsSlice";
import { getClientPlatform, isNativeClient } from "@/lib/runtime-platform";
import { describeFonts } from "@/lib/themes/fonts";
import { useTheme } from "@/lib/theme-context";
import { InfoRow, SettingsGroup } from "./settings-ui";
import { SyncSettingsSection } from "./sync-settings-section";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || null;

export function DataSection() {
  const { user } = useAuth();
  const { activeTheme } = useTheme();
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [platformLabel, setPlatformLabel] = useState("");
  const [apiBase, setApiBase] = useState("");
  const [buildKind, setBuildKind] = useState("Web");

  useEffect(() => {
    setPlatformLabel(getClientPlatform().label);
    setApiBase(getApiBaseUrl());
    setBuildKind(isNativeClient() ? "Android app (offline bundle)" : "Web");
    void countPendingOutbox()
      .then(setPending)
      .catch(() => setPending(null));
  }, []);

  async function exportData() {
    if (!user?.id) return;
    setExporting(true);
    try {
      const [accounts, transactions, budgets, goals, investments, categories] =
        await Promise.all([
          listAccounts(user.id),
          listTransactions(),
          listBudgets(),
          listGoals(),
          listInvestments(),
          listCategories(),
        ]);
      const payload = {
        exported_at: new Date().toISOString(),
        version: "1.0",
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          country: user.country,
          currency: user.currency,
          timezone: user.timezone,
        },
        accounts,
        transactions,
        budgets,
        goals,
        investments,
        categories,
      };
      const saved = await saveTextFile(
        `${APP_SLUG}-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(payload, null, 2),
        "application/json",
      );
      showToast({
        title: "Backup exported",
        description:
          saved.kind === "native"
            ? `Saved to ${saved.path}.`
            : `Your ${APP_NAME} data was downloaded as JSON.`,
        tone: "success",
      });
    } catch {
      showToast({
        title: "Export failed",
        description: `${APP_NAME} could not prepare your backup. Please try again.`,
        tone: "error",
      });
    } finally {
      setExporting(false);
    }
  }

  async function clearCache() {
    if (!user?.id) return;
    setClearing(true);
    try {
      const unsynced = await countPendingOutbox();
      if (unsynced > 0) {
        setPending(unsynced);
        showToast({
          title: "Sync first",
          description: `${unsynced} change${unsynced === 1 ? " hasn't" : "s haven't"} synced yet. Clearing now would lose ${unsynced === 1 ? "it" : "them"}.`,
          tone: "warning",
        });
        return;
      }
      await clearOfflineTables();
      await switchOfflineUser(user.id);
      invalidateHydrate();
      try {
        localStorage.removeItem(DISMISSED_NOTIFICATIONS_KEY);
      } catch {
        /* ignore */
      }
      setConfirmClear(false);
      showToast({
        title: "Local cache cleared",
        description: "Downloading a fresh copy of your data…",
        tone: "success",
      });
      await runSync("manual");
      notifyDataUpdated();
    } catch {
      showToast({
        title: "Could not clear the cache",
        description: "Try again, or sign out and back in.",
        tone: "error",
      });
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsGroup
        title="Your data"
        description="Export everything, or reset what's stored on this device."
      >
        <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--ds-gray-1000)]">
              Export backup
            </p>
            <p className="mt-0.5 text-[12px] leading-5 text-[var(--ds-gray-700)]">
              Accounts, transactions, categories, budgets, goals and investments as JSON.
            </p>
          </div>
          <Button variant="secondary" loading={exporting} onClick={() => void exportData()}>
            <Download size={14} aria-hidden />
            Export data
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--ds-gray-1000)]">
              Clear local cache
            </p>
            <p className="mt-0.5 text-[12px] leading-5 text-[var(--ds-gray-700)]">
              Removes the offline copy on this device and downloads it again.
              Nothing on your account is deleted.
              {pending ? ` ${pending} unsynced change${pending === 1 ? "" : "s"} — sync first.` : ""}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setConfirmClear(true)}>
            <Eraser size={14} aria-hidden />
            Clear cache
          </Button>
        </div>
      </SettingsGroup>

      <SyncSettingsSection />

      <SettingsGroup title={`About ${APP_NAME}`}>
        <InfoRow label="Version" value={APP_VERSION} mono />
        <InfoRow label="Build" value={BUILD_ID ? `${buildKind} · ${BUILD_ID}` : buildKind} />
        <InfoRow label="This device" value={platformLabel || "—"} />
        <InfoRow label="Server" value={apiBase || "—"} mono />
        <InfoRow
          label="Theme fonts"
          value={activeTheme ? describeFonts(activeTheme.fonts) : "—"}
        />
      </SettingsGroup>

      <ConfirmDialog
        open={confirmClear}
        title="Clear local cache?"
        description="The offline copy of your data on this device is removed and downloaded again from your account. You'll need a connection to see your data afterwards."
        confirmLabel="Clear cache"
        destructive
        busy={clearing}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearCache}
      />
    </div>
  );
}
