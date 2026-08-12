import { CheckCircle2, Plus } from "lucide-react";
import Link from "next/link";
import {
  DocH2,
  DocP,
  InlineLink,
  Kbd,
  RelatedLinks,
} from "@/components/guide/guide-ui";

export function TipsGuide() {
  return (
    <article>
      <DocH2>Shortcuts that save time</DocH2>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--ds-gray-900)]">
        <li className="flex gap-2">
          <CheckCircle2 size={16} className="mt-1 shrink-0" />
          <span>
            Open the command palette with <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> (or{" "}
            <Kbd>⌘</Kbd> + <Kbd>K</Kbd>) to jump anywhere quickly.
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
            Prefer transfers over fake “expense + income” pairs so balances stay
            correct.
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
          <CheckCircle2 size={16} className="mt-1 shrink-0" />
          <span>
            Use OpenRouter free models ending in <code>:free</code> when testing
            the advisor — watch for daily limit banners.
          </span>
        </li>
        <li className="flex gap-2">
          <Plus size={16} className="mt-1 shrink-0" />
          <span>
            Need help again? Return to the{" "}
            <InlineLink href="/guide">Guide overview</InlineLink> anytime from
            the sidebar.
          </span>
        </li>
      </ul>

      <DocH2>You are ready</DocH2>
      <DocP>
        Jump back to the <InlineLink href="/dashboard">dashboard</InlineLink>{" "}
        and start logging today’s activity — or keep reading previous chapters
        with the pager below.
      </DocP>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-[9px] bg-[var(--ds-gray-1000)] px-3.5 py-2 text-sm font-medium text-[var(--ds-primary-foreground)]"
        >
          Open dashboard
        </Link>
        <Link
          href="/guide"
          className="inline-flex items-center rounded-[9px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] px-3.5 py-2 text-sm font-medium"
        >
          Guide overview
        </Link>
      </div>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/guide/getting-started", label: "Getting started" },
          { href: "/guide/offline-sync", label: "Offline & sync" },
          { href: "/guide/ai", label: "AI Advisor" },
        ]}
      />
    </article>
  );
}
