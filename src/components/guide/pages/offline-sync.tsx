import { Cloud, CloudOff, Wifi } from "lucide-react";
import {
  Callout,
  DocH2,
  DocList,
  DocOl,
  DocP,
  InlineLink,
  RelatedLinks,
} from "@/components/guide/guide-ui";
import { APP_NAME } from "@/lib/brand";

export function OfflineSyncGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        {APP_NAME} keeps a local copy of your data. You can add expenses without
        waiting for the server. When the network is available, changes sync up.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>Traveling or on flaky mobile data</li>
        <li>Quick capture before the API responds</li>
        <li>Recovering pending work after reinstall (when backup applies)</li>
      </DocList>

      <DocH2>How to open sync controls</DocH2>
      <DocOl>
        <li>Use the sync indicator in the top bar</li>
        <li>
          Or open{" "}
          <InlineLink href="/settings?section=sync">
            Settings → Offline & Sync
          </InlineLink>
        </li>
      </DocOl>

      <DocH2>How it works</DocH2>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <div className="rounded-[12px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] p-4 text-center">
          <CloudOff size={22} className="mx-auto text-[var(--ds-gray-1000)]" />
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

      <DocP>
        Sync starts after login, when the device comes online, and when you tap
        Sync now. There is no noisy background timer every few seconds.
      </DocP>

      <Callout tone="tip" title="After a long offline stretch">
        Sync once before trusting multi-device reports or balances.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/documentation/mobile", label: "Mobile app" },
          { href: "/documentation/settings", label: "Settings" },
          { href: "/settings?section=sync", label: "Open sync settings" },
        ]}
      />
    </article>
  );
}
