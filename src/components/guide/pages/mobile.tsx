import { Smartphone } from "lucide-react";
import {
  Callout,
  DocH2,
  DocList,
  DocP,
  RelatedLinks,
} from "@/components/guide/guide-ui";
import { APP_NAME } from "@/lib/brand";

export function MobileGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        The Android app is the same {APP_NAME} experience in a native Capacitor
        shell. Bottom sheets slide up when you open a form and slide down when
        you close it.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>Capture spend on the go</li>
        <li>Work offline on mobile data</li>
        <li>Stay signed in without daily logins</li>
      </DocList>

      <DocH2>Phone tips</DocH2>
      <div className="mt-5 flex items-start gap-3 rounded-[14px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] p-4">
        <Smartphone size={22} className="mt-0.5 shrink-0" />
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-[var(--ds-gray-900)]">
          <li>Use the menu button to open navigation</li>
          <li>Stay signed in — refresh tokens are stored securely</li>
          <li>Confirm before exiting from home screens</li>
          <li>Sync when you regain signal after offline entry</li>
        </ul>
      </div>

      <Callout tone="note" title="Same product">
        Features match the web app. Prefer the Guide on either surface — chapters
        stay in sync.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/guide/offline-sync", label: "Offline & sync" },
          { href: "/guide/getting-started", label: "Getting started" },
        ]}
      />
    </article>
  );
}
