"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  BookOpen,
  ChartNoAxesCombined,
  CheckCircle2,
  Cloud,
  CloudOff,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  Plus,
  Repeat2,
  Settings,
  Smartphone,
  Sparkles,
  Target,
  TriangleAlert,
  TrendingUp,
  WalletCards,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { APP_NAME } from "@/lib/brand";

const SECTIONS = [
  { id: "start", label: "Getting started" },
  { id: "dashboard", label: "Dashboard" },
  { id: "accounts", label: "Accounts" },
  { id: "transactions", label: "Transactions" },
  { id: "budgets-goals", label: "Budgets & goals" },
  { id: "recurring", label: "Recurring" },
  { id: "loans-invest", label: "Loans & investments" },
  { id: "categories-spaces", label: "Categories & spaces" },
  { id: "reports-ai", label: "Reports & AI" },
  { id: "offline", label: "Offline & sync" },
  { id: "mobile", label: "Mobile app" },
  { id: "settings-admin", label: "Settings & admin" },
  { id: "tips", label: "Tips & shortcuts" },
] as const;

function Callout({
  tone = "tip",
  title,
  children,
}: {
  tone?: "tip" | "note" | "warn";
  title: string;
  children: ReactNode;
}) {
  const Icon =
    tone === "warn" ? TriangleAlert : tone === "note" ? BookOpen : Lightbulb;
  const styles =
    tone === "warn"
      ? "border-[color:color-mix(in_srgb,var(--ds-status-red)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--ds-status-red)_8%,transparent)]"
      : tone === "note"
        ? "border-[color:color-mix(in_srgb,var(--ds-focus-color)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--ds-focus-color)_8%,transparent)]"
        : "border-[color:color-mix(in_srgb,var(--ds-status-green)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--ds-status-green)_8%,transparent)]";
  return (
    <aside
      className={cn(
        "my-5 rounded-[12px] border px-4 py-3.5 sm:px-5 sm:py-4",
        styles,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          size={18}
          className="mt-0.5 shrink-0 text-[var(--ds-gray-1000)]"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--ds-gray-1000)]">
            {title}
          </p>
          <div className="mt-1 text-sm leading-6 text-[var(--ds-gray-900)]">
            {children}
          </div>
        </div>
      </div>
    </aside>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="relative flex gap-3 sm:gap-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--ds-gray-1000)] text-xs font-bold text-[var(--ds-background-100)]">
        {n}
      </span>
      <div className="min-w-0 pb-5">
        <p className="text-sm font-semibold text-[var(--ds-gray-1000)]">
          {title}
        </p>
        <div className="mt-1 text-sm leading-6 text-[var(--ds-gray-900)]">
          {children}
        </div>
      </div>
    </li>
  );
}

function FlowCard({
  icon: Icon,
  label,
  href,
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
}) {
  const body = (
    <>
      <Icon size={18} className="text-[var(--ds-gray-1000)]" />
      <span className="mt-2 text-xs font-medium text-[var(--ds-gray-1000)]">
        {label}
      </span>
    </>
  );
  const className =
    "flex min-h-[4.5rem] flex-col items-center justify-center rounded-[12px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] px-3 py-3 text-center transition-colors hover:border-[var(--ds-gray-400)]";
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[6px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ds-gray-1000)]">
      {children}
    </kbd>
  );
}

function DocH2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 border-b border-[var(--ds-gray-200)] pb-3 pt-10 text-[22px] font-semibold tracking-[-0.03em] text-[var(--ds-gray-1000)] first:pt-0 sm:scroll-mt-28 sm:text-[26px]"
    >
      {children}
    </h2>
  );
}

function DocH3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-6 text-base font-semibold text-[var(--ds-gray-1000)]">
      {children}
    </h3>
  );
}

function DocP({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-sm leading-7 text-[var(--ds-gray-900)] sm:text-[15px]">
      {children}
    </p>
  );
}

function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-[var(--ds-gray-1000)] underline decoration-[var(--ds-gray-400)] underline-offset-2 hover:decoration-[var(--ds-gray-1000)]"
    >
      {children}
    </Link>
  );
}

export function GuideDocs() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const ids = useMemo(() => SECTIONS.map((s) => s.id), []);

  useEffect(() => {
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.4, 0.7] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [ids]);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      <aside className="hidden lg:block">
        <nav
          aria-label="Guide table of contents"
          className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2"
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ds-gray-700)]">
            On this page
          </p>
          <ul className="space-y-0.5 border-l border-[var(--ds-gray-200)]">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={cn(
                    "-ml-px block border-l-2 py-1.5 pl-3 text-[13px] leading-5 transition-colors",
                    active === section.id
                      ? "border-[var(--ds-gray-1000)] font-medium text-[var(--ds-gray-1000)]"
                      : "border-transparent text-[var(--ds-gray-700)] hover:text-[var(--ds-gray-1000)]",
                  )}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <article className="min-w-0 pb-16">
        <header className="rounded-[16px] border border-[var(--ds-gray-200)] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--ds-focus-color)_10%,transparent),transparent_55%),var(--ds-background-elevated)] px-5 py-6 sm:px-8 sm:py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] px-3 py-1 text-[11px] font-medium text-[var(--ds-gray-900)]">
            <BookOpen size={13} />
            Product guide
          </div>
          <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.04em] text-[var(--ds-gray-1000)] sm:text-[34px]">
            Learn {APP_NAME} end to end
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ds-gray-900)] sm:text-[15px]">
            A practical walkthrough of accounts, money movement, budgets,
            offline sync, and the mobile app — written like product docs, not a
            manual dump.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="#start"
              className="inline-flex items-center rounded-[9px] bg-[var(--ds-gray-1000)] px-3.5 py-2 text-sm font-medium text-[var(--ds-background-100)]"
            >
              Start here
            </a>
            <a
              href="#offline"
              className="inline-flex items-center rounded-[9px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] px-3.5 py-2 text-sm font-medium text-[var(--ds-gray-1000)]"
            >
              Offline & sync
            </a>
          </div>
        </header>

        <nav
          aria-label="Guide sections"
          className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden"
        >
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-full border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--ds-gray-900)]"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <section>
          <DocH2 id="start">Getting started</DocH2>
          <DocP>
            {APP_NAME} is a local-first expense tracker: you can add money activity
            even when the network is slow, then sync when you are back online.
            The recommended setup path is short.
          </DocP>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <FlowCard icon={WalletCards} label="1. Add accounts" href="/accounts" />
            <FlowCard
              icon={ArrowLeftRight}
              label="2. Log money"
              href="/expenses"
            />
            <FlowCard
              icon={ChartNoAxesCombined}
              label="3. Set budgets"
              href="/budgets"
            />
            <FlowCard icon={LayoutDashboard} label="4. Review" href="/dashboard" />
          </div>

          <ol className="mt-6 space-y-0">
            <Step n={1} title="Sign in">
              Use your email and password. On the phone app, your session stays
              active for about a week so you are not asked to sign in every day.
            </Step>
            <Step n={2} title="Create your first account">
              Open <InlineLink href="/accounts">Accounts</InlineLink> and add a
              cash wallet, bank, or card. This is the container every transaction
              belongs to.
            </Step>
            <Step n={3} title="Record a transaction">
              Tap <strong>New</strong> (or the + button) and choose Expense,
              Income, or Transfer. Fill amount, account, category, and date.
            </Step>
            <Step n={4} title="Check the dashboard">
              <InlineLink href="/dashboard">Dashboard</InlineLink> shows
              balances, recent activity, and budget health at a glance.
            </Step>
          </ol>

          <Callout tone="tip" title="Default categories are ready">
            New users get a starter set of categories (food, rent, salary, and
            more). You can rename or add your own later under{" "}
            <InlineLink href="/categories">Categories</InlineLink>.
          </Callout>
        </section>

        <section>
          <DocH2 id="dashboard">Dashboard</DocH2>
          <DocP>
            The dashboard is your home screen. Use it to answer: “How much do I
            have?”, “What did I spend lately?”, and “Am I on track?”
          </DocP>
          <DocH3>What you will see</DocH3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--ds-gray-900)]">
            <li>Total balance across accounts</li>
            <li>Income vs expense summary for the period</li>
            <li>Recent transactions and budget progress</li>
          </ul>
          <Callout tone="note" title="Android back button">
            On the dashboard (and a few other root screens), pressing Android
            Back asks if you want to exit the app — it does not jump randomly
            through history.
          </Callout>
        </section>

        <section>
          <DocH2 id="accounts">Accounts</DocH2>
          <DocP>
            Accounts are where money lives: cash, bank, credit card, e-wallet,
            or any custom label you choose.
          </DocP>
          <DocH3>How to add one</DocH3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[var(--ds-gray-900)]">
            <li>
              Go to <InlineLink href="/accounts">Accounts</InlineLink>
            </li>
            <li>Tap Add account</li>
            <li>Enter name, type, starting balance, and currency</li>
            <li>Save — the balance updates as you post transactions</li>
          </ol>
          <Callout tone="tip" title="Transfers need two accounts">
            To move money between wallets, create at least two accounts first.
            Then use type <strong>Transfer</strong> and pick From / To.
          </Callout>
        </section>

        <section>
          <DocH2 id="transactions">Transactions</DocH2>
          <DocP>
            Transactions are the heart of {APP_NAME}. Every row is income, expense, or
            a transfer between accounts.
          </DocP>

          <div className="mt-5 overflow-hidden rounded-[14px] border border-[var(--ds-gray-200)]">
            <div className="grid grid-cols-3 divide-x divide-[var(--ds-gray-200)] bg-[var(--ds-background-100)] text-center text-xs font-semibold uppercase tracking-wide text-[var(--ds-gray-700)]">
              <div className="px-2 py-2.5">Expense</div>
              <div className="px-2 py-2.5">Income</div>
              <div className="px-2 py-2.5">Transfer</div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[var(--ds-gray-200)] text-center text-sm text-[var(--ds-gray-900)]">
              <div className="px-3 py-4">Money out of an account</div>
              <div className="px-3 py-4">Money into an account</div>
              <div className="px-3 py-4">Move between two accounts</div>
            </div>
          </div>

          <DocH3>Add a transaction</DocH3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[var(--ds-gray-900)]">
            <li>
              Open <InlineLink href="/expenses">Transactions</InlineLink> or tap
              the + / New button from the top bar
            </li>
            <li>Choose type: Expense, Income, or Transfer</li>
            <li>Enter amount, account, category (for income/expense), and date</li>
            <li>Optional: notes, tags, or attachment fields if available</li>
            <li>Save — the sheet slides down when you close it</li>
          </ol>

          <DocH3>Filters</DocH3>
          <DocP>
            Use search and date filters (From date / To date) to narrow the list.
            Edit or delete from the row action menu.
          </DocP>

          <Callout tone="warn" title="Deleting is permanent">
            Confirm dialogs protect destructive actions. Once deleted and
            synced, the row is gone from the server as well.
          </Callout>
        </section>

        <section>
          <DocH2 id="budgets-goals">Budgets & goals</DocH2>
          <DocP>
            Budgets cap spending by category for a period. Goals track saving
            toward a target amount.
          </DocP>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[14px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ChartNoAxesCombined size={16} /> Budgets
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--ds-gray-900)]">
                Pick a category, amount, and period. Progress fills as matching
                expenses post. Open{" "}
                <InlineLink href="/budgets">Budgets</InlineLink>.
              </p>
            </div>
            <div className="rounded-[14px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Target size={16} /> Goals
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--ds-gray-900)]">
                Set a target and current saved amount. Update progress as you
                save. Open <InlineLink href="/goals">Goals</InlineLink>.
              </p>
            </div>
          </div>
        </section>

        <section>
          <DocH2 id="recurring">Recurring</DocH2>
          <DocP>
            Recurring items cover rent, salary, subscriptions, and other
            repeating cash flow so you do not re-enter them every month.
          </DocP>
          <DocP>
            Create a template in <InlineLink href="/recurring">Recurring</InlineLink>{" "}
            with amount, frequency, and next date. When due, generate or confirm
            the transaction according to your workflow.
          </DocP>
          <Callout tone="tip" title="Pair with budgets">
            Put recurring expenses into the same categories you budget for, so
            progress stays accurate.
          </Callout>
        </section>

        <section>
          <DocH2 id="loans-invest">Loans & investments</DocH2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[14px] border border-[var(--ds-gray-200)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Landmark size={16} /> Loans & debts
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--ds-gray-900)]">
                Track money you owe or are owed — principal, payments, and
                status. Start in{" "}
                <InlineLink href="/loans">Loans & Debts</InlineLink>.
              </p>
            </div>
            <div className="rounded-[14px] border border-[var(--ds-gray-200)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp size={16} /> Investments
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--ds-gray-900)]">
                Log holdings and values separately from day-to-day spending
                accounts. Open{" "}
                <InlineLink href="/investments">Investments</InlineLink>.
              </p>
            </div>
          </div>
        </section>

        <section>
          <DocH2 id="categories-spaces">Categories & spaces</DocH2>
          <DocH3>Categories</DocH3>
          <DocP>
            Categories organize income and expenses for reports and budgets.
            Manage them in <InlineLink href="/categories">Categories</InlineLink>.
          </DocP>
          <DocH3>Spaces</DocH3>
          <DocP>
            Spaces let you separate personal and shared contexts (for example
            family or a trip). Switch spaces from the sidebar when available.
          </DocP>
        </section>

        <section>
          <DocH2 id="reports-ai">Reports & AI</DocH2>
          <DocH3>Reports</DocH3>
          <DocP>
            <InlineLink href="/reports">Reports</InlineLink> summarize spending
            and income over time so you can spot trends without exporting a
            spreadsheet first.
          </DocP>
          <DocH3>AI Advisor</DocH3>
          <DocP>
            <InlineLink href="/ai">AI Advisor</InlineLink> answers questions
            about your money habits. Configure models under{" "}
            <InlineLink href="/settings?section=ai">Settings → AI</InlineLink>.
          </DocP>
          <Callout tone="note" title="AI needs a provider">
            If chat fails, check that an API key / provider is set in Settings.
            Your transaction data stays in {APP_NAME}; the model only sees what the
            advisor sends for the prompt.
          </Callout>
        </section>

        <section>
          <DocH2 id="offline">Offline & sync</DocH2>
          <DocP>
            {APP_NAME} keeps a local copy of your data. You can add expenses without
            waiting for the server. When the network is available, changes sync
            up.
          </DocP>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <div className="rounded-[12px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] p-4 text-center">
              <CloudOff
                size={22}
                className="mx-auto text-[var(--ds-gray-1000)]"
              />
              <p className="mt-2 text-sm font-semibold">Work offline</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ds-gray-700)]">
                Creates and edits queue locally
              </p>
            </div>
            <div className="rounded-[12px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] p-4 text-center">
              <Wifi size={22} className="mx-auto text-[var(--ds-gray-1000)]" />
              <p className="mt-2 text-sm font-semibold">Network returns</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ds-gray-700)]">
                Sync runs on connect / login
              </p>
            </div>
            <div className="rounded-[12px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] p-4 text-center">
              <Cloud size={22} className="mx-auto text-[var(--ds-gray-1000)]" />
              <p className="mt-2 text-sm font-semibold">Cloud updated</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ds-gray-700)]">
                Pending badge clears
              </p>
            </div>
          </div>

          <DocH3>How to sync manually</DocH3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--ds-gray-900)]">
            <li>Use the sync indicator in the top bar</li>
            <li>
              Or open{" "}
              <InlineLink href="/settings?section=sync">
                Settings → Offline & Sync
              </InlineLink>
            </li>
          </ul>
          <Callout tone="tip" title="When sync runs">
            Sync starts after login, when the device comes online, and when you
            tap Sync now. There is no noisy background timer every few seconds.
          </Callout>
        </section>

        <section>
          <DocH2 id="mobile">Mobile app</DocH2>
          <DocP>
            The Android app is the same {APP_NAME} experience in a native shell
            (Capacitor). Bottom sheets slide up when you open a form and slide
            down when you close it.
          </DocP>
          <div className="mt-5 flex items-start gap-3 rounded-[14px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] p-4">
            <Smartphone size={22} className="mt-0.5 shrink-0" />
            <div className="text-sm leading-6 text-[var(--ds-gray-900)]">
              <p className="font-semibold text-[var(--ds-gray-1000)]">
                Phone tips
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>Use the menu button to open navigation</li>
                <li>Stay signed in — refresh tokens are stored securely</li>
                <li>Confirm before exiting from home screens</li>
                <li>Sync when you regain signal after offline entry</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <DocH2 id="settings-admin">Settings & admin</DocH2>
          <DocH3>Settings</DocH3>
          <DocP>
            <InlineLink href="/settings">Settings</InlineLink> covers profile,
            currency/country, appearance, AI providers, security, data backup,
            sync, and shortcuts.
          </DocP>
          <DocH3>Admin</DocH3>
          <DocP>
            Admins manage users and permissions from{" "}
            <InlineLink href="/admin">Admin</InlineLink>. Grant only the modules
            each person needs (accounts, expenses, reports, and so on).
          </DocP>
          <Callout tone="note" title="Permissions">
            If a sidebar item is missing, your role probably lacks that module’s
            access. Ask an admin to enable it.
          </Callout>
        </section>

        <section>
          <DocH2 id="tips">Tips & shortcuts</DocH2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--ds-gray-900)]">
            <li className="flex gap-2">
              <CheckCircle2 size={16} className="mt-1 shrink-0" />
              <span>
                Open the command palette with <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd>{" "}
                (or <Kbd>⌘</Kbd> + <Kbd>K</Kbd>) to jump anywhere quickly.
              </span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 size={16} className="mt-1 shrink-0" />
              <span>
                Toggle the sidebar with <Kbd>Ctrl</Kbd> + <Kbd>\</Kbd>.
              </span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 size={16} className="mt-1 shrink-0" />
              <span>
                Prefer transfers over fake “expense + income” pairs so balances
                stay correct.
              </span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 size={16} className="mt-1 shrink-0" />
              <span>
                After a long offline stretch, open Sync once before trusting
                multi-device reports.
              </span>
            </li>
            <li className="flex gap-2">
              <Plus size={16} className="mt-1 shrink-0" />
              <span>
                Need help again? This page lives under{" "}
                <InlineLink href="/guide">Guide</InlineLink> in the sidebar.
              </span>
            </li>
          </ul>

          <div className="mt-8 rounded-[14px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] px-5 py-5 text-center">
            <Sparkles size={20} className="mx-auto text-[var(--ds-gray-1000)]" />
            <p className="mt-2 text-sm font-semibold text-[var(--ds-gray-1000)]">
              You are ready
            </p>
            <p className="mt-1 text-sm text-[var(--ds-gray-900)]">
              Jump back to the{" "}
              <InlineLink href="/dashboard">dashboard</InlineLink> and start
              logging today’s activity.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-[9px] bg-[var(--ds-gray-1000)] px-3.5 py-2 text-sm font-medium text-[var(--ds-background-100)]"
              >
                Open dashboard
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] px-3.5 py-2 text-sm font-medium"
              >
                <Settings size={14} /> Settings
              </Link>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
