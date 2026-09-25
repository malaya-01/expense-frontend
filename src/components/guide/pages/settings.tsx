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

export function SettingsGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        Settings is the control center for profile, currency, emailed reports,
        appearance, AI providers, security, backup, sync, and shortcuts. Sections
        live in a single tab bar under the page title — not a second sidebar.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>Change theme or locale</li>
        <li>Connect OpenRouter / other AI keys</li>
        <li>Force a sync or review offline backup</li>
        <li>Update password or notification preferences</li>
        <li>Choose weekly, monthly, or custom emailed financial reports</li>
      </DocList>

      <DocH2>How to open it</DocH2>
      <DocOl>
        <li>
          Sidebar → <strong>Settings</strong> →{" "}
          <InlineLink href="/settings">/settings</InlineLink>
        </li>
        <li>
          Deep links like{" "}
          <InlineLink href="/settings?section=ai">?section=ai</InlineLink> jump
          to a tab
        </li>
      </DocOl>

      <DocH2>Screen walkthrough</DocH2>
      <FeatureGrid
        items={[
          {
            title: "General / profile",
            body: "Name, country, currency, timezone — how amounts display and when reports send.",
          },
          {
            title: "Reports by email",
            body: "Default is Saturday 10:00. Change to monthly or custom dates, and attach Excel plus AI coaching.",
          },
          {
            title: "Appearance",
            body: "Pick a theme palette; changes apply instantly.",
          },
          {
            title: "AI & models",
            body: "Bring your own keys; OpenRouter recommended for many models.",
          },
          {
            title: "Offline & sync",
            body: "Manual sync, pending status, and durable backup options. Also a Settings tab labeled Sync.",
          },
        ]}
      />

      <Callout tone="tip" title="AI section">
        Configure providers under{" "}
        <InlineLink href="/settings?section=ai">Settings → AI</InlineLink> before
        chatting in the advisor.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/documentation/ai", label: "AI Advisor" },
          { href: "/documentation/offline-sync", label: "Offline & sync" },
          { href: "/documentation/admin", label: "Admin" },
          { href: "/settings?section=reports", label: "Report emails" },
        ]}
      />
    </article>
  );
}
