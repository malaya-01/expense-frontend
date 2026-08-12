import {
  Callout,
  DocH2,
  DocList,
  DocOl,
  DocP,
  FeatureGrid,
  InlineLink,
  RelatedLinks,
} from "@/components/guide/guide-ui";
import { APP_NAME } from "@/lib/brand";

export function SpacesGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        Spaces are shared contexts inside {APP_NAME} — family, roommates, or a
        trip — with their own membership, shared wallet, expenses, and activity.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>Split costs with people who also use {APP_NAME}</li>
        <li>Keep a trip or event ledger separate from personal spending</li>
        <li>Settle balances without mixing personal accounts by default</li>
      </DocList>

      <DocH2>How to open it</DocH2>
      <DocOl>
        <li>
          Go to <InlineLink href="/spaces">/spaces</InlineLink> (also reachable
          from navigation when Spaces is enabled for you)
        </li>
        <li>Open a space to see its wallet, expenses, and members</li>
      </DocOl>

      <DocH2>Screen walkthrough</DocH2>
      <FeatureGrid
        items={[
          {
            title: "Spaces list",
            body: "Your memberships and invites waiting for a decision.",
          },
          {
            title: "Shared wallet",
            body: "Space-owned container for group money, separate from personal accounts.",
          },
          {
            title: "Expenses & splits",
            body: "Log shared spend and how it divides across members.",
          },
          {
            title: "Settlements",
            body: "Record who paid whom to zero out balances.",
          },
        ]}
      />

      <DocH2>How it works</DocH2>
      <DocP>
        Personal containers keep <code>space_id</code> empty. Space activity
        lives on space-owned containers. You can optionally link a personal
        share back to your own ledger when settling — otherwise group activity
        stays isolated.
      </DocP>

      <Callout tone="note" title="Invites">
        Inviting by email notifies existing {APP_NAME} users in-app. Accept from
        the invite link or Spaces inbox.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/documentation/accounts", label: "Accounts" },
          { href: "/documentation/transactions", label: "Transactions" },
          { href: "/spaces", label: "Open spaces" },
        ]}
      />
    </article>
  );
}
