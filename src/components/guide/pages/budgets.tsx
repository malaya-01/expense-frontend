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

export function BudgetsGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        Budgets set a spending cap for a category over a period (for example
        groceries this month). Progress fills as matching expenses post.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>You want a soft ceiling on dining, shopping, or transport</li>
        <li>You are repairing cash flow after overspending</li>
        <li>You need the dashboard to show budget health at a glance</li>
      </DocList>

      <DocH2>How to open it</DocH2>
      <DocOl>
        <li>
          Sidebar → <strong>Budgets</strong> →{" "}
          <InlineLink href="/budgets">/budgets</InlineLink>
        </li>
      </DocOl>

      <DocH2>Screen walkthrough</DocH2>
      <FeatureGrid
        items={[
          {
            title: "Budget cards",
            body: "Each card shows category, limit, spent, and remaining for the period.",
          },
          {
            title: "Create budget",
            body: "Pick category, amount, and period. Only expenses in that category count.",
          },
          {
            title: "Progress bar",
            body: "Fills as you spend; near-limit states help you slow down early.",
          },
          {
            title: "Empty state",
            body: "If you have no budgets yet, create one after categories exist.",
          },
        ]}
      />

      <DocH2>How it works</DocH2>
      <DocP>
        Budgets do not move money — they observe expenses tagged with the chosen
        category inside the period window. Transfers and income do not fill a
        spending budget. Keep categories consistent so progress stays accurate.
      </DocP>

      <DocOl>
        <li>
          Open <InlineLink href="/budgets">Budgets</InlineLink>
        </li>
        <li>Create a budget and choose category + amount + period</li>
        <li>Log expenses normally under that category</li>
        <li>Watch progress on Budgets and the Dashboard</li>
      </DocOl>

      <Callout tone="tip" title="Pair with recurring">
        Put recurring expenses into the same categories you budget for so
        progress stays honest month to month.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/documentation/categories", label: "Categories" },
          { href: "/documentation/goals", label: "Goals" },
          { href: "/documentation/transactions", label: "Transactions" },
          { href: "/budgets", label: "Open budgets" },
        ]}
      />
    </article>
  );
}
