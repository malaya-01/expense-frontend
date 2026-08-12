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

export function ReportsGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        Reports summarize spending and income over time so you can spot trends
        without exporting a spreadsheet first.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>Month-end review of where money went</li>
        <li>Comparing periods or categories</li>
        <li>Preparing questions for the AI advisor with real numbers</li>
      </DocList>

      <DocH2>How to open it</DocH2>
      <DocOl>
        <li>
          Sidebar → <strong>Reports</strong> →{" "}
          <InlineLink href="/reports">/reports</InlineLink>
        </li>
      </DocOl>

      <DocH2>Screen walkthrough</DocH2>
      <FeatureGrid
        items={[
          {
            title: "Period controls",
            body: "Choose the window you care about — this month, last month, custom ranges.",
          },
          {
            title: "Summaries",
            body: "Income, expense, and net at a glance for the selected period.",
          },
          {
            title: "Breakdowns",
            body: "Category and trend views that highlight leaks and stable costs.",
          },
          {
            title: "Drill-down",
            body: "Jump back to transactions when a number needs an explanation.",
          },
        ]}
      />

      <DocH2>How it works</DocH2>
      <DocP>
        Reports read posted transactions and categories from your twin. Uncategorized
        or mis-tagged rows skew charts — fix labels in Transactions or Categories,
        then revisit Reports. Offline, charts reflect local data until sync
        catches up.
      </DocP>

      <Callout tone="tip" title="Sync before big decisions">
        After a long offline stretch on another device, sync once so multi-device
        reports are trustworthy.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/guide/transactions", label: "Transactions" },
          { href: "/guide/categories", label: "Categories" },
          { href: "/guide/ai", label: "AI Advisor" },
          { href: "/reports", label: "Open reports" },
        ]}
      />
    </article>
  );
}
