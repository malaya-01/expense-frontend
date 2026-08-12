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
import { APP_NAME } from "@/lib/brand";

export function AiGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        AI Advisor is {APP_NAME}&apos;s in-app CFO: ask about habits, cash flow,
        budgets, and documents. It can propose actions — you confirm before
        anything writes to your twin.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>“Where did my money go this month?”</li>
        <li>Draft a budget or seed categories for approval</li>
        <li>Upload a receipt and propose a transaction</li>
        <li>Run a what-if with twin context</li>
      </DocList>

      <DocH2>How to open it</DocH2>
      <DocOl>
        <li>
          Sidebar → <strong>AI Advisor</strong> →{" "}
          <InlineLink href="/ai">/ai</InlineLink>
        </li>
        <li>
          Connect a provider first under{" "}
          <InlineLink href="/settings?section=ai">Settings → AI</InlineLink>
        </li>
      </DocOl>

      <DocH2>Screen walkthrough</DocH2>
      <FeatureGrid
        items={[
          {
            title: "Conversation rail",
            body: "Past chats, pin/archive, and start a new thread.",
          },
          {
            title: "Chat workspace",
            body: "Ask questions, attach files, enable web search when needed.",
          },
          {
            title: "Proposals",
            body: "Confirm or reject create/update actions before they apply.",
          },
          {
            title: "Tools & context",
            body: "Advisor loads twin data (accounts, budgets, etc.) to ground answers.",
          },
        ]}
      />

      <DocH2>How it works</DocH2>
      <DocP>
        You bring your own API key. {APP_NAME} encrypts credentials on the
        server and sends only the prompt context needed for the reply. OpenRouter
        is recommended: one key unlocks many models. Free-tier limits are handled
        with a clear banner and retry — switch models or wait for reset if you
        hit the daily cap.
      </DocP>

      <Callout tone="tip" title="Recommended: OpenRouter">
        Paste a key from{" "}
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noreferrer"
          className="link-accent font-medium"
        >
          openrouter.ai/keys
        </a>
        , pick a model (free models often end with <code>:free</code>), Test,
        then Use. See the{" "}
        <a
          href="https://openrouter.ai/docs/quickstart"
          target="_blank"
          rel="noreferrer"
          className="link-accent font-medium"
        >
          OpenRouter quickstart
        </a>
        .
      </Callout>

      <Callout tone="note" title="You stay in control">
        The model never silently moves money. Action proposals need your Confirm
        in the UI.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/documentation/settings", label: "Settings" },
          { href: "/documentation/reports", label: "Reports" },
          { href: "/settings?section=ai", label: "AI settings" },
          { href: "/ai", label: "Open AI Advisor" },
        ]}
      />
    </article>
  );
}
