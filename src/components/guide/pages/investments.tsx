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

export function InvestmentsGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        Investments track holdings and values separately from day-to-day
        spending accounts so portfolio worth is visible without polluting
        grocery budgets.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>Stocks, mutual funds, crypto, gold, or other holdings</li>
        <li>You want net worth to include investments</li>
        <li>You update valuations periodically, not every purchase</li>
      </DocList>

      <DocH2>How to open it</DocH2>
      <DocOl>
        <li>
          Sidebar → <strong>Investments</strong> →{" "}
          <InlineLink href="/investments">/investments</InlineLink>
        </li>
      </DocOl>

      <DocH2>Screen walkthrough</DocH2>
      <FeatureGrid
        items={[
          {
            title: "Holdings list",
            body: "Name, quantity/value, and contribution to your twin.",
          },
          {
            title: "Add holding",
            body: "Create an asset entry with identifying details and value.",
          },
          {
            title: "Value updates",
            body: "Refresh marks so reports and net worth stay current.",
          },
          {
            title: "Separation",
            body: "Keep brokerage cash as an account if you spend from it; holdings stay here.",
          },
        ]}
      />

      <DocH2>How it works</DocH2>
      <DocP>
        Investment rows represent assets you hold. They are not substitutes for
        expense categories. Moving cash into a brokerage may be a transfer or
        purchase flow depending on how you model it — keep the story consistent.
      </DocP>

      <Callout tone="tip" title="Start simple">
        One holding per major position is enough. Fine-grained lots can come
        later once the twin habit sticks.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/documentation/accounts", label: "Accounts" },
          { href: "/documentation/reports", label: "Reports" },
          { href: "/investments", label: "Open investments" },
        ]}
      />
    </article>
  );
}
