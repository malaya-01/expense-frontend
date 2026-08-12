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

export function DashboardGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        The dashboard is your home screen. It answers three questions quickly:
        how much do I have, what moved lately, and am I on track?
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>Start of the day or week for a pulse check</li>
        <li>After logging several transactions to confirm balances</li>
        <li>Before deciding on a purchase or transfer</li>
      </DocList>

      <DocH2>How to open it</DocH2>
      <DocOl>
        <li>
          Sidebar → <strong>Dashboard</strong>, or go to{" "}
          <InlineLink href="/dashboard">/dashboard</InlineLink>
        </li>
        <li>On mobile, open the menu and choose Dashboard</li>
      </DocOl>

      <DocH2>Screen walkthrough</DocH2>
      <FeatureGrid
        items={[
          {
            title: "Balance summary",
            body: "Totals across your accounts so net cash is visible without opening each wallet.",
          },
          {
            title: "Income vs expense",
            body: "Period snapshot of money in and out — useful for catching lifestyle creep early.",
          },
          {
            title: "Recent activity",
            body: "Latest transactions with quick access to open or edit a row.",
          },
          {
            title: "Budget health",
            body: "Progress toward category caps so overspending shows up before month end.",
          },
        ]}
      />

      <DocH2>How it works</DocH2>
      <DocP>
        Numbers on the dashboard are derived from accounts and posted
        transactions in your twin — not from a separate spreadsheet. If a balance
        looks wrong, fix the underlying account or transaction; the dashboard
        will follow after sync.
      </DocP>

      <Callout tone="note" title="Android back button">
        On the dashboard (and a few other root screens), Android Back asks if
        you want to exit the app — it does not jump randomly through history.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/documentation/accounts", label: "Accounts" },
          { href: "/documentation/transactions", label: "Transactions" },
          { href: "/documentation/reports", label: "Reports" },
          { href: "/dashboard", label: "Open dashboard" },
        ]}
      />
    </article>
  );
}
