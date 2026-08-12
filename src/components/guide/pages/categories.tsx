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

export function CategoriesGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        Categories organize income and expenses so budgets, reports, and the AI
        advisor can group activity by meaning — food, rent, salary, and so on.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>Rename or add labels that match how you think</li>
        <li>Clean up duplicates before building budgets</li>
        <li>Seed a richer taxonomy with help from AI proposals</li>
      </DocList>

      <DocH2>How to open it</DocH2>
      <DocOl>
        <li>
          Sidebar → <strong>Categories</strong> →{" "}
          <InlineLink href="/categories">/categories</InlineLink>
        </li>
      </DocOl>

      <DocH2>Screen walkthrough</DocH2>
      <FeatureGrid
        items={[
          {
            title: "Category list",
            body: "Names, colors/icons, and type (income vs expense) where applicable.",
          },
          {
            title: "Create / edit",
            body: "Add a label, tweak appearance, or archive ones you no longer use.",
          },
          {
            title: "Defaults",
            body: "New users receive a starter set so you can log money immediately.",
          },
          {
            title: "Budget link",
            body: "Budgets attach to categories — inconsistent names break progress.",
          },
        ]}
      />

      <DocH2>How it works</DocH2>
      <DocP>
        When you post an expense or income, you pick a category. Reports sum by
        that label. Budgets watch the same label. Prefer a small, stable set over
        dozens of one-off tags.
      </DocP>

      <Callout tone="tip" title="AI can propose categories">
        In{" "}
        <InlineLink href="/guide/ai">AI Advisor</InlineLink>, ask to review or
        seed categories — confirm proposals before they apply.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/guide/budgets", label: "Budgets" },
          { href: "/guide/transactions", label: "Transactions" },
          { href: "/guide/ai", label: "AI Advisor" },
          { href: "/categories", label: "Open categories" },
        ]}
      />
    </article>
  );
}
