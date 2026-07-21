"use client";

import { useRouter } from "next/navigation";
import { LogOut, Plus, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ThemeMenu } from "@/components/layout/theme-menu";
import { openCommandPalette } from "@/components/layout/command-palette";
import { NotificationCenter } from "@/components/layout/notification-center";

export function AppTopbar() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 bg-[var(--ds-background-100)]/88 px-4 backdrop-blur-xl sm:px-6 ds-header-rule">
      <button
        type="button"
        onClick={openCommandPalette}
        className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-[10px] bg-[var(--ds-background-elevated)] px-3.5 text-left text-[13px] transition-colors hover:bg-[var(--ds-gray-100)] ds-border ds-focus sm:max-w-md"
        aria-label="Open command palette"
      >
        <Search size={15} className="shrink-0 text-[var(--ds-gray-700)]" />
        <span className="min-w-0 flex-1 truncate text-[var(--ds-gray-700)]">
          Search FinOS or run a command…
        </span>
        <kbd className="hidden rounded-[4px] bg-[var(--ds-background-200)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ds-gray-900)] sm:inline">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <NotificationCenter />
        <ThemeMenu showCreateLink />
        <Button
          size="sm"
          onClick={() => router.push("/expenses/new")}
          className="hidden sm:inline-flex"
        >
          <Plus size={15} />
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
          <LogOut size={15} />
          Log out
        </Button>
      </div>
    </header>
  );
}
