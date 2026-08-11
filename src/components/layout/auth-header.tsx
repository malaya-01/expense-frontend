"use client";

import { BrandLogo } from "@/components/brand/brand-logo";
import { ThemeMenu } from "@/components/layout/theme-menu";
import { APP_TAGLINE } from "@/lib/brand";

export function AuthHeader() {
  return (
    <header className="h-14">
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
