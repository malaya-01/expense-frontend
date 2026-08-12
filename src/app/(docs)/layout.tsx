"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ThemeMenu } from "@/components/layout/theme-menu";
import { APP_NAME } from "@/lib/brand";
import {
  documentationPortalUrl,
  DOCUMENTATION_BASE,
} from "@/lib/docs/portal";
import { isNativeClient } from "@/lib/runtime-platform";

/**
 * Public documentation shell — no auth, no app chrome.
 * Native builds open the web portal instead of rendering docs in-app.
 */
export default function DocumentationLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [nativeRedirect, setNativeRedirect] = useState(false);

  useEffect(() => {
    if (!isNativeClient()) return;
    setNativeRedirect(true);
    const target = documentationPortalUrl(pathname || DOCUMENTATION_BASE);
    window.open(target, "_blank", "noopener,noreferrer");
  }, [pathname]);

  if (nativeRedirect) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--ds-background-100)] px-6 text-center">
        <BrandLogo size={28} plated />
        <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
          Opening documentation in your browser…
        </p>
        <p className="max-w-sm text-xs leading-5 text-[var(--ds-gray-700)]">
          Docs stay on the web portal so they are not mixed with the signed-in
          mobile app. You can close this screen and keep using {APP_NAME}.
        </p>
        <a
          href={documentationPortalUrl(pathname || DOCUMENTATION_BASE)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-sm font-medium text-[var(--ds-link-color)] underline-offset-2 hover:underline"
        >
          Open documentation
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--ds-background-100)]">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] px-3 sm:px-4">
        <Link
          href={DOCUMENTATION_BASE}
          className="flex min-w-0 items-center gap-2 rounded-[7px] px-1 py-1 text-[13px] font-medium text-[var(--ds-gray-1000)] ds-focus"
        >
          <BrandLogo size={22} plated />
          <span className="truncate">
            {APP_NAME}
            <span className="ml-1.5 font-normal text-[var(--ds-gray-700)]">
              Documentation
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeMenu compact showCreateLink={false} />
          <Link
            href="/signin"
            className="rounded-[8px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--ds-gray-1000)] hover:border-[var(--ds-gray-400)]"
          >
            Sign in
          </Link>
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
