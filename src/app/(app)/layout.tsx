"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar, MobileNav } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
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
    <div className="flex min-h-screen bg-[var(--ds-background-100)]">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-8">
          <div className="mx-auto w-full max-w-[var(--ds-page-width)]">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
