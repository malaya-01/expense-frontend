import {
  Callout,
  DocH2,
  DocH3,
  DocList,
  DocOl,
  DocP,
  FeatureGrid,
  InlineLink,
  RelatedLinks,
} from "@/components/guide/guide-ui";
import { APP_NAME } from "@/lib/brand";

export function TransactionsGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        Transactions are the heart of {APP_NAME}. Every row is an expense,
        income, or a transfer between accounts — the ledger of your twin.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>Log a purchase, paycheck, or refund</li>
        <li>Move money between wallets without fake expense+income pairs</li>
        <li>Search history by date, account, or description</li>
      </DocList>

      <DocH2>How to open it</DocH2>
      <DocOl>
        <li>
          Sidebar → <strong>Transactions</strong> →{" "}
          <InlineLink href="/expenses">/expenses</InlineLink>
        </li>
        <li>
          Or tap <strong>New</strong> / + in the top bar from almost anywhere
        </li>
      </DocOl>

      <DocH2>Types at a glance</DocH2>
      <div className="mt-5 overflow-hidden rounded-[14px] border border-[var(--ds-gray-200)]">
        <div className="grid grid-cols-3 divide-x divide-[var(--ds-gray-200)] bg-[var(--ds-background-100)] text-center text-xs font-semibold uppercase tracking-wide text-[var(--ds-gray-700)]">
          <div className="px-2 py-2.5">Expense</div>
          <div className="px-2 py-2.5">Income</div>
          <div className="px-2 py-2.5">Transfer</div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[var(--ds-gray-200)] text-center text-sm text-[var(--ds-gray-900)]">
          <div className="px-3 py-4">Money out of an account</div>
          <div className="px-3 py-4">Money into an account</div>
          <div className="px-3 py-4">Move between two accounts</div>
        </div>
      </div>

      <DocH2>Screen walkthrough</DocH2>
      <FeatureGrid
        items={[
          {
            title: "List & filters",
            body: "Search and From/To dates narrow the ledger. Row actions edit or delete.",
          },
          {
            title: "New transaction sheet",
            body: "Slides up with type, amount, accounts, category, date, notes.",
          },
          {
            title: "Categories",
            body: "Required for expense/income so budgets and reports can group spend.",
          },
          {
            title: "Attachments",
            body: "Where available, attach receipts or notes for later review.",
          },
        ]}
      />

      <DocH2>How it works</DocH2>
      <DocP>
        Saving a transaction posts to the ledger and updates account balances.
        Offline, the change queues locally and syncs when the network returns.
        Prefer a single transfer over “expense from A + income to B” so net worth
        stays honest.
      </DocP>

      <DocH3>Add a transaction</DocH3>
      <DocOl>
        <li>
          Open <InlineLink href="/expenses">Transactions</InlineLink> or tap New
        </li>
        <li>Choose Expense, Income, or Transfer</li>
        <li>Enter amount, account(s), category (income/expense), and date</li>
        <li>Optional notes — then Save</li>
      </DocOl>

      <Callout tone="warn" title="Deleting is permanent">
        Confirm dialogs protect destructive actions. Once deleted and synced,
        the row is gone from the server as well.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/documentation/accounts", label: "Accounts" },
          { href: "/documentation/categories", label: "Categories" },
          { href: "/documentation/recurring", label: "Recurring" },
          { href: "/expenses", label: "Open transactions" },
        ]}
      />
    </article>
  );
}
