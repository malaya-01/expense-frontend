"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
  Cloud,
  Database,
  Info,
  Keyboard,
  LogOut,
  Palette,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PasswordInput } from "@/components/ui/password-input";
import { AppearanceSection } from "@/components/settings/theme-settings";
import { AiProvidersSection } from "@/components/settings/ai-providers-section";
import { SyncSettingsSection } from "@/components/settings/sync-settings-section";
import { useAuth } from "@/lib/auth-context";
import {
  COUNTRIES,
  SUPPORTED_CURRENCIES,
  getCountry,
} from "@/lib/currency/currency.data";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/toast";
import { listAccounts } from "@/lib/api/accounts";
import { listTransactions } from "@/lib/api/transactions";
import { listBudgets } from "@/lib/api/budgets";
import { listGoals } from "@/lib/api/goals";
import { listInvestments } from "@/lib/api/investments";
import { listCategories } from "@/lib/api/categories";
import { changePassword, updateProfile } from "@/lib/api/user";
import { getErrorMessage } from "@/lib/api/client";
import { openCommandPalette } from "@/components/layout/command-palette";
import { getClientPlatform } from "@/lib/runtime-platform";
import { useModulePermissions } from "@/components/permissions/permission-gate";

const SECTIONS = [
  { id: "general", label: "General", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "ai", label: "AI & Models", icon: Bot },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "data", label: "Data & Backup", icon: Database },
  { id: "sync", label: "Offline & Sync", icon: Cloud },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  { id: "session", label: "Session", icon: LogOut },
  { id: "about", label: "About", icon: Info },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function SettingsPage() {
  const { user, setSession, logout } = useAuth();
  const settingsPerms = useModulePermissions("settings");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [section, setSection] = useState<SectionId>("general");
  const [exporting, setExporting] = useState(false);

  const [country, setCountry] = useState(user?.country || "US");
  const [currency, setCurrency] = useState(user?.currency || "USD");
  const [timezone, setTimezone] = useState(user?.timezone || "UTC");
  const [savingDefaults, setSavingDefaults] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const sortedCountries = useMemo(
    () => [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  useEffect(() => {
    const requested = searchParams.get("section");
    if (SECTIONS.some((item) => item.id === requested)) {
      setSection(requested as SectionId);
    }
  }, [searchParams]);

  useEffect(() => {
    setCountry(user?.country || "US");
    setCurrency(user?.currency || "USD");
    setTimezone(user?.timezone || "UTC");
  }, [user?.country, user?.currency, user?.timezone]);

  function go(id: SectionId) {
    setSection(id);
    router.replace(`/settings?section=${id}`, { scroll: false });
  }

  async function saveDefaults(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingDefaults(true);
    try {
      const updated = await updateProfile({ country, currency, timezone });
      setSession({ ...user, ...updated });
      showToast({
        title: "Defaults saved",
        description: "Country, currency, and timezone updated.",
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Could not save defaults",
        description: getErrorMessage(err),
        tone: "error",
      });
    } finally {
      setSavingDefaults(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showToast({
        title: "Passwords do not match",
        description: "Re-enter the same new password.",
        tone: "warning",
      });
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      showToast({
        title: "Password updated",
        description: "Your password was changed successfully.",
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Password change failed",
        description: getErrorMessage(err),
        tone: "error",
      });
    } finally {
      setSavingPassword(false);
    }
  }

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
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `finos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast({
        title: "Backup exported",
        description: "Your FinOS data was downloaded as JSON.",
        tone: "success",
      });
    } catch {
      showToast({
        title: "Export failed",
        description: "FinOS could not prepare your backup. Please try again.",
        tone: "error",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure FinOS security, AI providers, appearance, and workspace tools."
      />

      <div className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto rounded-[12px] bg-[var(--ds-background-elevated)] p-1.5 ds-border lg:sticky lg:top-14 lg:h-fit lg:flex-col lg:overflow-visible">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              className={cn(
                "flex min-h-10 items-center gap-2.5 rounded-[8px] px-3 py-2 text-left text-[13px] whitespace-nowrap ds-focus",
                section === item.id
                  ? "bg-[var(--ds-gray-100)] font-medium text-[var(--ds-gray-1000)]"
                  : "text-[var(--ds-gray-900)] hover:bg-[var(--ds-background-100)]",
              )}
            >
              <item.icon size={15} className="shrink-0 opacity-80" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-4">
          {section === "general" ? (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-base font-semibold">
                    Workspace defaults
                  </h2>
                  <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                    Reporting currency and regional defaults for totals.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => router.push("/profile")}
                >
                  Open profile
                </Button>
              </CardHeader>
              <CardBody>
                <form onSubmit={saveDefaults} className="space-y-3 sm:space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Select
                        id="country"
                        value={country}
                        onChange={(e) => {
                          const code = e.target.value;
                          setCountry(code);
                          const meta = getCountry(code);
                          if (meta) setCurrency(meta.currency);
                        }}
                      >
                        {sortedCountries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="currency">Base currency</Label>
                      <Select
                        id="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      >
                        {SUPPORTED_CURRENCIES.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      id="timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      loading={savingDefaults}
                      disabled={!settingsPerms.update}
                    >
                      Save defaults
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          ) : null}

          {section === "ai" ? <AiProvidersSection /> : null}
          {section === "appearance" ? <AppearanceSection /> : null}

          {section === "security" ? (
            <div className="space-y-3 sm:space-y-4">
              <Card>
                <CardHeader>
                  <h2 className="font-heading text-base font-semibold">
                    Change password
                  </h2>
                  <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                    Update the password used to sign in to FinOS.
                  </p>
                </CardHeader>
                <CardBody>
                  <form onSubmit={onChangePassword} className="space-y-3 sm:space-y-4">
                    <div>
                      <Label htmlFor="currentPassword">Current password</Label>
                      <PasswordInput
                        id="currentPassword"
                        autoComplete="current-password"
                        required
                        minLength={8}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="newPassword">New password</Label>
                        <PasswordInput
                          id="newPassword"
                          autoComplete="new-password"
                          required
                          minLength={8}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirmNewPassword">Confirm new</Label>
                        <PasswordInput
                          id="confirmNewPassword"
                          autoComplete="new-password"
                          required
                          minLength={8}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        loading={savingPassword}
                        disabled={!settingsPerms.update}
                      >
                        Update password
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <h2 className="font-heading text-base font-semibold">
                    Security posture
                  </h2>
                </CardHeader>
                <CardBody className="space-y-3 text-xs leading-5 text-[var(--ds-gray-700)]">
                  <p>
                    Sessions use signed access tokens with automatic refresh.
                    AI provider secrets are encrypted at rest (AES-256-GCM).
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push("/forgot-password")}
                  >
                    Reset via email instead
                  </Button>
                </CardBody>
              </Card>
            </div>
          ) : null}

          {section === "data" ? (
            <div className="space-y-3 sm:space-y-4">
              <Card>
                <CardHeader>
                  <h2 className="font-heading text-base font-semibold">
                    Export backup
                  </h2>
                  <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                    Download accounts, transactions, categories, budgets, goals,
                    and investments as JSON.
                  </p>
                </CardHeader>
                <CardBody>
                  <Button
                    variant="secondary"
                    loading={exporting}
                    onClick={exportData}
                  >
                    Export data
                  </Button>
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <h2 className="font-heading text-base font-semibold">
                    Local cache
                  </h2>
                  <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                    Clear dismissed notifications stored in this browser. Does
                    not delete server data.
                  </p>
                </CardHeader>
                <CardBody>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      localStorage.removeItem("finos:dismissed-notifications");
                      showToast({
                        title: "Local cache cleared",
                        description: "Dismissed notification state was reset.",
                        tone: "success",
                      });
                    }}
                  >
                    Clear dismissed notifications
                  </Button>
                </CardBody>
              </Card>
            </div>
          ) : null}

          {section === "sync" ? <SyncSettingsSection /> : null}

          {section === "shortcuts" ? (
            <Card>
              <CardHeader>
                <h2 className="font-heading text-base font-semibold">
                  Keyboard shortcuts
                </h2>
                <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                  Try them now — open the command palette from here.
                </p>
              </CardHeader>
              <CardBody className="space-y-1">
                <Shortcut label="Command palette" keys="Ctrl / Cmd + K" />
                <Shortcut label="New transaction" keys="Ctrl / Cmd + N" />
                <Shortcut label="Navigate command results" keys="↑ / ↓" />
                <Shortcut label="Run selected command" keys="Enter" />
                <Shortcut label="Close dialogs and panels" keys="Esc" />
                <div className="pt-3">
                  <Button size="sm" variant="secondary" onClick={openCommandPalette}>
                    Open command palette
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {section === "session" ? (
            <Card>
              <CardHeader>
                <h2 className="font-heading text-base font-semibold">Session</h2>
                <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                  Signed in as {user?.email || "—"}. Signing out only affects
                  this device.
                </p>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-[12px] text-[var(--ds-gray-800)]">
                  This session:{" "}
                  <strong className="text-[var(--ds-gray-1000)]">
                    {getClientPlatform().label}
                  </strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="danger"
                    onClick={() => {
                      logout();
                      router.replace("/signin");
                    }}
                  >
                    Log out
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => router.push("/profile")}
                  >
                    Edit profile
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {section === "about" ? (
            <Card>
              <CardHeader>
                <h2 className="font-heading text-base font-semibold">
                  About FinOS
                </h2>
              </CardHeader>
              <CardBody className="space-y-3">
                <Row label="Application" value="FinOS" />
                <Row label="Version" value="0.1.0" mono />
                <Row
                  label="Product"
                  value="Personal Financial Operating System"
                />
                <p className="pt-2 text-xs leading-5 text-[var(--ds-gray-700)]">
                  A privacy-first digital financial twin with ledger-backed
                  accounting and a confirmation-gated AI advisor.
                </p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-[var(--ds-gray-900)]">{label}</span>
      <span
        className={
          mono
            ? "max-w-[60%] truncate font-mono text-[13px] text-[var(--ds-gray-700)]"
            : "text-sm text-[var(--ds-gray-1000)]"
        }
      >
        {value}
      </span>
    </div>
  );
}

function Shortcut({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_6%,transparent)] py-2 last:border-b-0">
      <span className="text-[13px] text-[var(--ds-gray-900)]">{label}</span>
      <kbd className="rounded-[7px] bg-[var(--ds-background-200)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--ds-gray-900)] ds-border">
        {keys}
      </kbd>
    </div>
  );
}
