"use client";

import { ThemeMenu } from "@/components/layout/theme-menu";

export function AuthHeader() {
  return (
    <header className="h-14">
      <div className="mx-auto flex h-full max-w-[420px] items-center justify-between px-4 sm:px-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-[-0.28px] text-[var(--ds-gray-1000)]">
            FinOS
          </span>
          <span className="hidden text-xs text-[var(--ds-gray-700)] sm:inline">
            Financial OS
          </span>
        </div>
        <ThemeMenu compact showCreateLink={false} />
      </div>
    </header>
  );
}
