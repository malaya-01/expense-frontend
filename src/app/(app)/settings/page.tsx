"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
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
import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { AppearanceSection } from "@/components/settings/theme-settings";
import { AiProvidersSection } from "@/components/settings/ai-providers-section";
import { useAuth } from "@/lib/auth-context";
import { getCountry } from "@/lib/currency/currency.data";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/toast";
import { listAccounts } from "@/lib/api/accounts";
import { listTransactions } from "@/lib/api/transactions";
import { listBudgets } from "@/lib/api/budgets";
import { listGoals } from "@/lib/api/goals";
import { listInvestments } from "@/lib/api/investments";
import { listCategories } from "@/lib/api/categories";

const SECTIONS = [
  { id: "general", label: "General", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "ai", label: "AI & Models", icon: Bot },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "data", label: "Data & Backup", icon: Database },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  { id: "session", label: "Session", icon: LogOut },
  { id: "about", label: "About", icon: Info },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [section, setSection] = useState<SectionId>("general");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const requested = searchParams.get("section");
    if (SECTIONS.some((item) => item.id === requested)) {
      setSection(requested as SectionId);
    }
  }, [searchParams]);

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
        description="Personalize FinOS, protect your data, and configure your financial workspace."
      />

      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                "flex min-h-11 items-center gap-2.5 rounded-[9px] px-3 py-2 text-left text-[13px] whitespace-nowrap ds-focus",
                section === item.id
                  ? "bg-[var(--ds-gray-100)] font-medium text-[var(--ds-gray-1000)]"
                  : "text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)]",
              )}
            >
              <item.icon size={15} className="shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-4">
          {section === "general" ? (
            <>
              <Card>
                <CardHeader>
                  <h2>Profile</h2>
                </CardHeader>
                <CardBody className="space-y-3">
                  <Row label="Name" value={user?.full_name || "—"} />
                  <Row label="Email" value={user?.email || "—"} />
                  <Row
                    label="User ID"
                    value={user?.id || "—"}
                    mono
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <h2>Defaults</h2>
                </CardHeader>
                <CardBody className="space-y-3">
                  <Row
                    label="Country"
                    value={
                      user?.country
                        ? getCountry(user.country)?.name || user.country
                        : "—"
                    }
                  />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-[var(--ds-gray-900)]">
                      Base currency
                    </span>
                    <span className="inline-flex items-center gap-2 text-sm">
                      <StatusDot tone="green" />
                      {user?.currency || "USD"}
                    </span>
                  </div>
                  <Row label="Timezone" value={user?.timezone || "UTC"} />
                  <p className="pt-1 text-xs leading-4 text-[var(--ds-gray-700)]">
                    Totals convert into your base currency. Accounts and transfers
                    keep their own currencies.
                  </p>
                </CardBody>
              </Card>
            </>
          ) : null}

          {section === "ai" ? <AiProvidersSection /> : null}
          {section === "appearance" ? <AppearanceSection /> : null}

          {section === "security" ? (
            <Card>
              <CardHeader>
                <h2>Security status</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <SecurityRow
                  label="Authenticated session"
                  description="Requests use signed access tokens with automatic refresh."
                />
                <SecurityRow
                  label="Encrypted AI credentials"
                  description="Provider secrets are encrypted with AES-256-GCM before storage."
                />
                <SecurityRow
                  label="Confirmation-gated AI actions"
                  description="The Advisor cannot change financial data without your approval."
                />
                <p className="rounded-[10px] bg-[var(--ds-background-100)] p-3 text-xs leading-5 text-[var(--ds-gray-700)]">
                  FinOS never displays stored provider secrets after saving them.
                  Disconnect a provider from AI & Models to remove its credentials.
                </p>
              </CardBody>
            </Card>
          ) : null}

          {section === "data" ? (
            <Card>
              <CardHeader>
                <h2>Data & backup</h2>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Export a portable backup</p>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--ds-gray-700)]">
                      Download accounts, transactions, categories, budgets,
                      goals, and investments in a readable JSON file.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    loading={exporting}
                    onClick={exportData}
                  >
                    Export data
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {section === "shortcuts" ? (
            <Card>
              <CardHeader>
                <h2>Keyboard shortcuts</h2>
              </CardHeader>
              <CardBody className="divide-y divide-[var(--ds-gray-200)]">
                <Shortcut label="Command palette" keys="Ctrl / Cmd + K" />
                <Shortcut label="New transaction" keys="Ctrl / Cmd + N" />
                <Shortcut label="Navigate command results" keys="↑ / ↓" />
                <Shortcut label="Run selected command" keys="Enter" />
                <Shortcut label="Close dialogs and panels" keys="Esc" />
              </CardBody>
            </Card>
          ) : null}

          {section === "session" ? (
            <Card>
              <CardHeader>
                <h2>Session</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-sm text-[var(--ds-gray-900)]">
                  Sign out of FinOS on this device. Provider keys stay encrypted
                  on the server until you disconnect them.
                </p>
                <Button
                  variant="danger"
                  onClick={() => {
                    logout();
                    router.replace("/signin");
                  }}
                >
                  Log out
                </Button>
              </CardBody>
            </Card>
          ) : null}

          {section === "about" ? (
            <Card>
              <CardHeader>
                <h2>About FinOS</h2>
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

function SecurityRow({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ds-status-green)_12%,transparent)] text-[var(--ds-status-green)]">
        <ShieldCheck size={14} />
      </span>
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-[var(--ds-gray-700)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function Shortcut({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 py-2">
      <span className="text-[13px] text-[var(--ds-gray-900)]">{label}</span>
      <kbd className="rounded-[7px] bg-[var(--ds-background-200)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--ds-gray-900)] ds-border">
        {keys}
      </kbd>
    </div>
  );
}
