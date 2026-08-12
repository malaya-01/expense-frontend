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

export function GoalsGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        Goals track saving toward a target amount — emergency fund, trip, down
        payment — with visible progress as you contribute.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>You are saving for something concrete with a number attached</li>
        <li>You want motivation beyond “spend less”</li>
        <li>You may link progress to a dedicated savings account</li>
      </DocList>

      <DocH2>How to open it</DocH2>
      <DocOl>
        <li>
          Sidebar → <strong>Goals</strong> →{" "}
          <InlineLink href="/goals">/goals</InlineLink>
        </li>
      </DocOl>

      <DocH2>Screen walkthrough</DocH2>
      <FeatureGrid
        items={[
          {
            title: "Goal cards",
            body: "Target amount, current progress, and status toward completion.",
          },
          {
            title: "Create / edit",
            body: "Set name, target, current saved amount, and optional linked account.",
          },
          {
            title: "Contributions",
            body: "Update progress as you save — keep the twin aligned with reality.",
          },
          {
            title: "Completion",
            body: "When current reaches target, celebrate and optionally start a new goal.",
          },
        ]}
      />

      <DocH2>How it works</DocH2>
      <DocP>
        Goals are planning objects. Linking an account (when available) can
        mirror that account’s balance; otherwise you update saved amounts
        manually. They complement budgets: budgets constrain spending, goals pull
        surplus toward a purpose.
      </DocP>

      <Callout tone="note" title="Not the same as a budget">
        A grocery budget limits outflow. A vacation goal tracks inflow toward a
        target. Use both when that matches how you think about money.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/guide/budgets", label: "Budgets" },
          { href: "/guide/accounts", label: "Accounts" },
          { href: "/goals", label: "Open goals" },
        ]}
      />
    </article>
  );
}
