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

export function AdminGuide() {
  return (
    <article>
      <DocH2>What it is</DocH2>
      <DocP>
        Admin manages users and module permissions for your workspace. Only
        admins see this entry in the sidebar.
      </DocP>

      <DocH2>When to use it</DocH2>
      <DocList>
        <li>Invite or review users on a shared deployment</li>
        <li>Grant only the modules each person needs</li>
        <li>Debug “missing sidebar item” complaints</li>
      </DocList>

      <DocH2>How to open it</DocH2>
      <DocOl>
        <li>
          Sidebar → <strong>Admin</strong> →{" "}
          <InlineLink href="/admin">/admin</InlineLink> (admins only)
        </li>
      </DocOl>

      <DocH2>Screen walkthrough</DocH2>
      <FeatureGrid
        items={[
          {
            title: "Users",
            body: "List accounts and admin flags for the workspace.",
          },
          {
            title: "Permissions",
            body: "Module access (accounts, expenses, reports, AI, and so on).",
          },
          {
            title: "Least privilege",
            body: "Grant create/update/delete only where needed.",
          },
          {
            title: "Missing nav",
            body: "If a sidebar item is gone, the role likely lacks that module.",
          },
        ]}
      />

      <Callout tone="note" title="Permissions">
        If a sidebar item is missing, ask an admin to enable that module’s
        access for your user.
      </Callout>

      <DocH2>Related</DocH2>
      <RelatedLinks
        items={[
          { href: "/documentation/settings", label: "Settings" },
          { href: "/admin", label: "Open admin" },
        ]}
      />
    </article>
  );
}
