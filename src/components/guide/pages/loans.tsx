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

export function LoansGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        Loans & debts track money you owe or are owed — principal, payments, and
        status — so liabilities are visible in the twin, not only in your head.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>Personal loans, EMIs, or informal debts</li>
        <li>Money friends or family owe you (receivables)</li>
        <li>You want payment progress separate from day-to-day expenses</li>
      </DocList>

      <DocH2>How to open it</DocH2>
      <DocOl>
        <li>
          Sidebar → <strong>Loans & Debts</strong> →{" "}
          <InlineLink href="/loans">/loans</InlineLink>
        </li>
      </DocOl>

      <DocH2>Screen walkthrough</DocH2>
      <FeatureGrid
        items={[
          {
            title: "Loan list",
            body: "Open balances, counterparties, and status at a glance.",
          },
          {
            title: "Create loan",
            body: "Capture principal, direction (owe vs owed), and key dates.",
          },
          {
            title: "Payments",
            body: "Record payments that reduce remaining principal over time.",
          },
          {
            title: "Status",
            body: "Active vs settled helps keep the twin focused on what still matters.",
          },
        ]}
      />

      <DocH2>How it works</DocH2>
      <DocP>
        Loans sit alongside accounts so net worth thinking can include
        liabilities. Payment entries should match how cash actually left (or
        entered) your accounts — otherwise balances and loan progress drift
        apart.
      </DocP>

      <Callout tone="note" title="Credit cards">
        Everyday card spend usually lives as an account + expenses. Use Loans
        for structured debt with a payoff story, not every swipe.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/documentation/accounts", label: "Accounts" },
          { href: "/documentation/transactions", label: "Transactions" },
          { href: "/loans", label: "Open loans" },
        ]}
      />
    </article>
  );
}
