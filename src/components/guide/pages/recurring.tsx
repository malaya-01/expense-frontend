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

export function RecurringGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        Recurring templates cover rent, salary, subscriptions, and other
        repeating cash flow so you do not re-enter them every cycle.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>Fixed monthly bills or income you can predict</li>
        <li>Subscriptions that are easy to forget in reports</li>
        <li>You want next-due dates visible in one place</li>
      </DocList>

      <DocH2>How to open it</DocH2>
      <DocOl>
        <li>
          Sidebar → <strong>Recurring</strong> →{" "}
          <InlineLink href="/recurring">/recurring</InlineLink>
        </li>
      </DocOl>

      <DocH2>Screen walkthrough</DocH2>
      <FeatureGrid
        items={[
          {
            title: "Template list",
            body: "Each row is a schedule: amount, frequency, next date, linked accounts/categories.",
          },
          {
            title: "Create template",
            body: "Define type (expense/income), amount, cadence, and where it posts.",
          },
          {
            title: "Due / generate",
            body: "When due, generate or confirm the transaction according to your workflow.",
          },
          {
            title: "Pause or edit",
            body: "Change amount or skip a cycle without deleting history.",
          },
        ]}
      />

      <DocH2>How it works</DocH2>
      <DocP>
        A recurring item is a recipe, not the posted transaction itself. When you
        generate from a template, a real ledger row is created and balances
        update like any other transaction. Align categories with budgets so
        progress stays correct.
      </DocP>

      <Callout tone="tip" title="Pair with budgets">
        Put recurring expenses into the same categories you budget for.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/guide/transactions", label: "Transactions" },
          { href: "/guide/budgets", label: "Budgets" },
          { href: "/recurring", label: "Open recurring" },
        ]}
      />
    </article>
  );
}
