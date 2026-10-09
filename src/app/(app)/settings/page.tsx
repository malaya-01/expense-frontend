"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  Database,
  Globe2,
  Keyboard,
  LifeBuoy,
  Palette,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { AppearanceSection } from "@/components/settings/theme-settings";
import { AiProvidersSection } from "@/components/settings/ai-providers-section";
import { NotificationPreferencesCard } from "@/components/settings/sync-settings-section";
import { ReportScheduleSection } from "@/components/settings/report-schedule-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { SecuritySection } from "@/components/settings/security-section";
import { RegionalSection } from "@/components/settings/regional-section";
import { TransactionsSection } from "@/components/settings/transactions-section";
import { DataSection } from "@/components/settings/data-section";
import { DangerSection } from "@/components/settings/danger-section";
import { TutorialSection } from "@/components/settings/tutorial-section";
import {
  SettingsDirtyContext,
  SettingsGroup,
} from "@/components/settings/settings-ui";
import { openCommandPalette } from "@/components/layout/command-palette";
import { useModulePermissions } from "@/components/permissions/permission-gate";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

type SectionDef = {
  id: string;
  label: string;
  blurb: string;
  icon: ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  /** Hidden from the phone list (e.g. keyboard shortcuts). */
  desktopOnly?: boolean;
  tone?: "danger";
};

const SECTIONS: SectionDef[] = [
  {
    id: "profile",
    label: "Profile",
    blurb: "Your name, photo and account details.",
    icon: UserRound,
  },
  {
    id: "security",
    label: "Sign-in & security",
    blurb: "Password, active sessions and signed-in devices.",
    icon: ShieldCheck,
  },
  {
    id: "regional",
    label: "Regional & formatting",
    blurb: "Currency, timezone, and how numbers, dates and weeks look.",
    icon: Globe2,
  },
  {
    id: "transactions",
    label: "Transactions",
    blurb: "Defaults for new transactions and delete safety.",
    icon: ArrowLeftRight,
  },
  {
    id: "appearance",
    label: "Appearance",
    blurb: "Theme and fonts, density, text size and motion.",
    icon: Palette,
  },
  {
    id: "notifications",
    label: "Notifications & reports",
    blurb: "Emailed financial reports and in-app alerts.",
    icon: Bell,
  },
  {
    id: "ai",
    label: "AI",
    blurb: "Providers, models, memory and the advisor prompt.",
    icon: Sparkles,
  },
  {
    id: "data",
    label: "Data & sync",
    blurb: "Export, offline sync, local cache and app info.",
    icon: Database,
  },
  {
    id: "help",
    label: "Help & tutorial",
    blurb: "Replay the guided tour and open the documentation.",
    icon: LifeBuoy,
  },
  {
    id: "shortcuts",
    label: "Keyboard shortcuts",
    blurb: "Move through Opal faster.",
    icon: Keyboard,
    desktopOnly: true,
  },
  {
    id: "danger",
    label: "Danger zone",
    blurb: "Delete your account.",
    icon: TriangleAlert,
    tone: "danger",
  },
];

/** Old ?section= ids keep working. */
const LEGACY_SECTIONS: Record<string, string> = {
  general: "regional",
  reports: "notifications",
  session: "security",
  sync: "data",
  about: "data",
  tutorial: "help",
};

const DEFAULT_SECTION = "profile";

function resolveSection(raw: string | null): string | null {
  if (!raw) return null;
  const id = LEGACY_SECTIONS[raw] ?? raw;
  return SECTIONS.some((section) => section.id === id) ? id : null;
}

function useIsDesktop(): boolean | null {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return desktop;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsSkeleton() {
  return (
    <div role="status" aria-label="Loading settings" className="space-y-4">
      <span className="block h-8 w-40 animate-pulse rounded-[8px] bg-[var(--ds-gray-100)]" />
      <span className="block h-4 w-72 max-w-full animate-pulse rounded-[6px] bg-[var(--ds-gray-100)]" />
      <span className="block h-64 w-full animate-pulse rounded-[14px] bg-[var(--ds-gray-100)]" />
    </div>
  );
}

function SettingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, ready } = useAuth();
  const perms = useModulePermissions("settings");
  const isDesktop = useIsDesktop();

  const requested = resolveSection(searchParams.get("section"));
  const active = requested ?? (isDesktop ? DEFAULT_SECTION : null);
  const activeDef = SECTIONS.find((section) => section.id === active) ?? null;

  /* -------- unsaved-changes guard -------- */
  const dirtyRef = useRef(new Set<string>());
  const [dirtyCount, setDirtyCount] = useState(0);
  const dirtyContext = useMemo(
    () => ({
      setDirty: (key: string, dirty: boolean) => {
        const set = dirtyRef.current;
        const had = set.has(key);
        if (dirty && !had) set.add(key);
        else if (!dirty && had) set.delete(key);
        else return;
        setDirtyCount(set.size);
      },
    }),
    [],
  );
  const [pendingNav, setPendingNav] = useState<string | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!dirtyCount) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyCount]);

  const pushedRef = useRef(false);
  const navigate = useCallback(
    (id: string | null) => {
      const href = id ? `/settings?section=${id}` : "/settings";
      // Phones: entering a section is a sub-page, so Back returns to the list.
      if (!isDesktop && id) {
        pushedRef.current = true;
        router.push(href, { scroll: false });
      } else {
        router.replace(href, { scroll: false });
      }
      document.querySelector("main")?.scrollTo({ top: 0 });
    },
    [isDesktop, router],
  );

  /** Phone "back to list": pop our own history entry when we pushed one. */
  const backToList = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      router.back();
    } else {
      navigate(null);
    }
  }, [navigate, router]);

  const go = useCallback(
    (id: string | null) => {
      if (id === active) return;
      if (dirtyRef.current.size > 0) {
        setPendingNav(id);
        return;
      }
      navigate(id);
    },
    [active, navigate],
  );

  const visibleSections = SECTIONS.filter(
    (section) => isDesktop !== false || !section.desktopOnly,
  );

  if (!ready || isDesktop === null) return <SettingsSkeleton />;

  const showList = !isDesktop && !activeDef;

  return (
    <SettingsDirtyContext.Provider value={dirtyContext}>
      <div className="min-w-0">
        {showList || isDesktop ? (
          <ModuleHeader
            title="Settings"
            description="Your account, how Opal looks and formats money, and how your data syncs."
          />
        ) : null}

        {!perms.update && user ? (
          <Alert
            className="mb-4"
            tone="info"
            title="View only"
            description="Your role can view settings but not change them."
          />
        ) : null}

        <div className="md:grid md:grid-cols-[13.5rem_minmax(0,1fr)] md:gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          {/* Desktop: sticky left nav. Phones: the section list page. */}
          {isDesktop ? (
            <nav aria-label="Settings sections" className="min-w-0">
              <ul className="sticky top-0 space-y-0.5">
                {visibleSections.map((section) => {
                  const Icon = section.icon;
                  const current = section.id === active;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => go(section.id)}
                        aria-current={current ? "page" : undefined}
                        className={cn(
                          "flex min-h-10 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-left text-[13px] transition-colors ds-focus",
                          current
                            ? "bg-[var(--ds-background-elevated)] font-medium text-[var(--ds-gray-1000)] shadow-[var(--ds-shadow-border)]"
                            : "text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]",
                          section.tone === "danger" &&
                            !current &&
                            "text-[var(--ds-status-red)]",
                        )}
                      >
                        <Icon size={15} aria-hidden className="shrink-0 opacity-80" />
                        <span className="truncate">{section.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}

          {showList ? (
            <nav aria-label="Settings sections">
              <ul className="overflow-hidden rounded-[14px] bg-[var(--ds-background-elevated)] ds-border">
                {visibleSections.map((section, index) => {
                  const Icon = section.icon;
                  return (
                    <li
                      key={section.id}
                      className={cn(
                        index > 0 &&
                          "border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_7%,transparent)]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => go(section.id)}
                        className="flex min-h-[3.75rem] w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-[var(--ds-gray-100)] ds-focus"
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                            section.tone === "danger"
                              ? "bg-[var(--ds-danger-hover)] text-[var(--ds-status-red)]"
                              : "bg-[var(--ds-background-200)] text-[var(--ds-gray-1000)]",
                          )}
                        >
                          <Icon size={17} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-[14px] font-medium",
                              section.tone === "danger"
                                ? "text-[var(--ds-status-red)]"
                                : "text-[var(--ds-gray-1000)]",
                            )}
                          >
                            {section.label}
                          </span>
                          <span className="block truncate text-[12px] text-[var(--ds-gray-700)]">
                            {section.blurb}
                          </span>
                        </span>
                        <ChevronRight
                          size={16}
                          aria-hidden
                          className="shrink-0 text-[var(--ds-gray-700)]"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}

          {activeDef ? (
            <section aria-labelledby="settings-section-title" className="min-w-0">
              {!isDesktop ? (
                <button
                  type="button"
                  onClick={() => (dirtyRef.current.size ? setPendingNav(null) : backToList())}
                  className="-ml-1.5 mb-2 inline-flex min-h-10 items-center gap-1 rounded-[8px] px-1.5 text-[13px] text-[var(--ds-gray-900)] ds-focus"
                >
                  <ChevronLeft size={16} aria-hidden />
                  Settings
                </button>
              ) : null}
              <header className="mb-4">
                <h2
                  id="settings-section-title"
                  className={cn(
                    "font-heading text-[20px] font-semibold tracking-[-0.02em] sm:text-[22px]",
                    activeDef.tone === "danger"
                      ? "text-[var(--ds-status-red)]"
                      : "text-[var(--ds-gray-1000)]",
                  )}
                >
                  {activeDef.label}
                </h2>
                <p className="mt-1 text-[13px] leading-5 text-[var(--ds-gray-700)]">
                  {activeDef.blurb}
                </p>
              </header>
              <SectionBody id={activeDef.id} canUpdate={perms.update} />
            </section>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={pendingNav !== undefined}
        title="Discard unsaved changes?"
        description="You have changes in this section that haven't been saved."
        confirmLabel="Discard changes"
        destructive
        onClose={() => setPendingNav(undefined)}
        onConfirm={() => {
          const target = pendingNav;
          setPendingNav(undefined);
          dirtyRef.current.clear();
          setDirtyCount(0);
          if (target === null && !isDesktop) backToList();
          else navigate(target ?? null);
        }}
      />
    </SettingsDirtyContext.Provider>
  );
}

function SectionBody({ id, canUpdate }: { id: string; canUpdate: boolean }) {
  switch (id) {
    case "profile":
      return <ProfileSection canUpdate={canUpdate} />;
    case "security":
      return <SecuritySection canUpdate={canUpdate} />;
    case "regional":
      return <RegionalSection canUpdate={canUpdate} />;
    case "transactions":
      return <TransactionsSection canUpdate={canUpdate} />;
    case "appearance":
      return <AppearanceSection />;
    case "notifications":
      return (
        <div className="space-y-4">
          <ReportScheduleSection canUpdate={canUpdate} />
          <NotificationPreferencesCard />
        </div>
      );
    case "ai":
      return <AiProvidersSection />;
    case "data":
      return <DataSection />;
    case "help":
      return <TutorialSection />;
    case "shortcuts":
      return <ShortcutsSection />;
    case "danger":
      return <DangerSection canUpdate={canUpdate} />;
    default:
      return null;
  }
}

function ShortcutsSection() {
  const shortcuts: Array<[string, string]> = [
    ["Command palette", "Ctrl / ⌘ + K"],
    ["New transaction", "Ctrl / ⌘ + N"],
    ["Move through results", "↑ / ↓"],
    ["Run selected command", "Enter"],
    ["Close dialogs and panels", "Esc"],
  ];
  return (
    <SettingsGroup
      title="Keyboard shortcuts"
      actions={
        <Button size="sm" variant="secondary" onClick={openCommandPalette}>
          Open command palette
        </Button>
      }
    >
      {shortcuts.map(([label, keys]) => (
        <div key={label} className="flex min-h-12 items-center justify-between gap-4 py-2">
          <span className="text-[13px] text-[var(--ds-gray-900)]">{label}</span>
          <kbd className="rounded-[7px] bg-[var(--ds-background-200)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--ds-gray-900)] ds-border">
            {keys}
          </kbd>
        </div>
      ))}
    </SettingsGroup>
  );
}
