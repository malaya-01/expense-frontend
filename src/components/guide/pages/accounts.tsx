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

export function AccountsGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        Accounts are financial containers — places value lives: cash, bank,
        credit card, e-wallet, investment cash, or a custom label. {APP_NAME}{" "}
        treats every balance as belonging to a container.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>First setup: create the wallets you actually use</li>
        <li>You opened a new bank or card and need it in the twin</li>
        <li>You want to archive or rename a container without losing history</li>
      </DocList>

      <DocH2>How to open it</DocH2>
      <DocOl>
        <li>
          Sidebar → <strong>Accounts</strong> →{" "}
          <InlineLink href="/accounts">/accounts</InlineLink>
        </li>
        <li>Use search in the command palette: “Accounts”</li>
      </DocOl>

      <DocH2>Screen walkthrough</DocH2>
      <FeatureGrid
        items={[
          {
            title: "Account list",
            body: "Each row shows name, type, and current balance in your preferred display currency when rates apply.",
          },
          {
            title: "Add account",
            body: "Creates a new container with starting balance, currency, and optional institution notes.",
          },
          {
            title: "Account detail",
            body: "Drill into recent linked transactions and adjust metadata.",
          },
          {
            title: "Types",
            body: "Cash, bank, credit card, investment, loan-related, and other types help reports group correctly.",
          },
        ]}
      />

      <DocH2>How it works</DocH2>
      <DocP>
        Posting an expense decreases the source account. Income increases a
        destination account. Transfers move value between two containers without
        inventing income or expense. Opening balances seed the twin so history
        starts from a known point.
      </DocP>

      <DocH3>Add an account</DocH3>
      <DocOl>
        <li>
          Open <InlineLink href="/accounts">Accounts</InlineLink>
        </li>
        <li>Tap Add account</li>
        <li>Enter name, type, starting balance, and currency</li>
        <li>Save — balances update as you post transactions</li>
      </DocOl>

      <Callout tone="tip" title="Transfers need two accounts">
        To move money between wallets, create at least two accounts first. Then
        use type <strong>Transfer</strong> and pick From / To.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/documentation/transactions", label: "Transactions" },
          { href: "/documentation/loans", label: "Loans" },
          { href: "/documentation/investments", label: "Investments" },
          { href: "/accounts", label: "Open accounts" },
        ]}
      />
    </article>
  );
}
