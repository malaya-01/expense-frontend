import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  LayoutDashboard,
  WalletCards,
} from "lucide-react";
import {
  Callout,
  DocH2,
  DocH3,
  DocList,
  DocP,
  FlowCard,
  InlineLink,
  RelatedLinks,
  Step,
} from "@/components/guide/guide-ui";
import { APP_NAME } from "@/lib/brand";

export function GettingStartedGuide() {
  return (
    <article>
      <DocH2>What this covers</DocH2>
      <DocP>
        {APP_NAME} is a local-first money app: you can log activity even when the
        network is slow, then sync when you are back online. This chapter gets
        you from a fresh sign-in to a useful home screen.
      </DocP>

      <DocH2>When to use this path</DocH2>
      <DocList>
        <li>You just created an account and the twin is empty</li>
        <li>You reinstalled the app and need a clean mental model again</li>
        <li>You want the shortest route before exploring advanced modules</li>
      </DocList>

      <DocH2>Recommended setup flow</DocH2>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FlowCard icon={WalletCards} label="1. Add accounts" href="/accounts" />
        <FlowCard icon={ArrowLeftRight} label="2. Log money" href="/expenses" />
        <FlowCard
          icon={ChartNoAxesCombined}
          label="3. Set budgets"
          href="/budgets"
        />
        <FlowCard icon={LayoutDashboard} label="4. Review" href="/dashboard" />
      </div>

      <DocH2>Step by step</DocH2>
      <ol className="mt-6 space-y-0">
        <Step n={1} title="Sign in">
          Use your email and password. On the phone app, your session stays
          active for about a week so you are not asked to sign in every day.
        </Step>
        <Step n={2} title="Create your first account">
          Open <InlineLink href="/accounts">Accounts</InlineLink> and add a cash
          wallet, bank, or card. Every transaction belongs to at least one
          account (a financial container).
        </Step>
        <Step n={3} title="Record a transaction">
          Tap <strong>New</strong> (or +) and choose Expense, Income, or
          Transfer. Fill amount, account, category, and date.
        </Step>
        <Step n={4} title="Check the dashboard">
          <InlineLink href="/dashboard">Dashboard</InlineLink> shows balances,
          recent activity, and budget health at a glance.
        </Step>
      </ol>

      <Callout tone="tip" title="Default categories are ready">
        New users get a starter set of categories (food, rent, salary, and
        more). Rename or extend them later under{" "}
        <InlineLink href="/categories">Categories</InlineLink>.
      </Callout>

      <DocH3>How navigation works</DocH3>
      <DocP>
        The left sidebar (menu on mobile) is the main map of {APP_NAME}. Open
        any module from there, or jump with the command palette (
        <InlineLink href="/guide/tips">Tips</InlineLink>). The Guide itself is
        under the same sidebar so you can flip between docs and the live screen.
      </DocP>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/guide/dashboard", label: "Dashboard guide" },
          { href: "/guide/accounts", label: "Accounts guide" },
          { href: "/guide/transactions", label: "Transactions guide" },
          { href: "/dashboard", label: "Open dashboard" },
        ]}
      />
    </article>
  );
}
