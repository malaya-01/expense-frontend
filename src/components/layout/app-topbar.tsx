"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ThemeMenu } from "@/components/layout/theme-menu";

export function AppTopbar() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 bg-[var(--ds-background-100)]/90 px-4 backdrop-blur-md sm:px-6 ds-header-rule">
      <button
        type="button"
        onClick={() => {
          /* Command palette placeholder */
        }}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[6px] bg-[var(--ds-background-elevated)] px-3 text-left text-[13px] text-[var(--ds-gray-700)] ds-border ds-focus sm:max-w-md"
      >
        <span className="truncate">Ask FinOS or search transactions…</span>
        <kbd className="ml-auto hidden rounded-[4px] bg-[var(--ds-background-200)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ds-gray-900)] sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <ThemeMenu showCreateLink />
        <Button
          size="sm"
          onClick={() => router.push("/expenses/new")}
          className="hidden sm:inline-flex"
        >
          New transaction
        </Button>
        <span
          className="flex size-8 items-center justify-center rounded-full bg-[var(--ds-background-200)] text-xs font-medium text-[var(--ds-gray-1000)]"
          title={user?.full_name || user?.email}
        >
          {initials(user?.full_name, user?.email)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => {
            logout();
            router.replace("/signin");
          }}
        >
          Log out
        </Button>
      </div>
    </header>
  );
}
