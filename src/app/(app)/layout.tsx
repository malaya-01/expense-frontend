"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar, MobileNav } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { useAuth } from "@/lib/auth-context";
import { getAccessToken } from "@/lib/api/client";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { ready, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated && !getAccessToken()) {
      router.replace("/signin");
    }
  }, [ready, isAuthenticated, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--ds-gray-900)]">Loading FinOS…</p>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-hidden bg-[var(--ds-background-100)]">
      <AppTopbar />
      <AppSidebar />
      <main className="app-scrollbar h-[calc(100dvh-2.75rem)] translate-y-11 overflow-y-auto overscroll-contain px-4 py-6 pb-24 transition-[margin-left] duration-200 sm:px-6 sm:py-8 md:ml-[var(--app-sidebar-offset)] md:pb-10">
        <div className="mx-auto w-full max-w-[var(--ds-page-width)]">
          {children}
        </div>
      </main>
      <MobileNav />
      <CommandPalette />
    </div>
  );
}
