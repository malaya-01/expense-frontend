"use client";

import { BrandLogo } from "@/components/brand/brand-logo";
import { ThemeMenu } from "@/components/layout/theme-menu";
import { APP_TAGLINE } from "@/lib/brand";

export function AuthHeader() {
  return (
    // box-content: the 3.5rem bar sits below the status bar / notch inset
    // (non-zero only for edge-to-edge WebViews with viewport-fit=cover).
    <header className="box-content h-14 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-full max-w-[420px] items-center justify-between px-4 sm:px-0">
        <div className="flex items-center gap-2">
          <BrandLogo size={22} plated showWordmark />
          <span className="hidden text-xs text-[var(--ds-gray-700)] sm:inline">
            {APP_TAGLINE}
          </span>
        </div>
        <ThemeMenu compact showCreateLink={false} />
      </div>
    </header>
  );
}
