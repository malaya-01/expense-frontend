"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar, MobileNav } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { TransactionModalProvider } from "@/components/expenses/transaction-modal-provider";
import { useAuth } from "@/lib/auth-context";
import { getAccessToken } from "@/lib/api/client";
import { fetchMyPermissions } from "@/lib/api/permissions";
import { cn } from "@/lib/cn";
import { bootstrapOfflineSync } from "@/lib/offline/sync-engine";
import { NetworkStatusBanner } from "@/components/sync/network-status-banner";
import {
  firstAllowedPath,
  hasPermission,
  permissionForPath,
} from "@/lib/permissions";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, isAuthenticated, user, setPermissions } = useAuth();
  const isAiWorkspace = pathname === "/ai" || pathname.startsWith("/ai/");

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated && !getAccessToken()) {
      router.replace("/signin");
      return;
    }
    if (isAuthenticated || getAccessToken()) {
      void bootstrapOfflineSync(user?.id);
      void fetchMyPermissions()
        .then((perms) => setPermissions(perms))
        .catch(() => {
          /* keep cached permissions if refresh fails */
        });
    }
  }, [ready, isAuthenticated, router, user?.id, setPermissions]);

  useEffect(() => {
    if (!ready || !user) return;
    const required = permissionForPath(pathname);
    if (!required) return;
    if (hasPermission(user, required)) return;
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      if (
        user.is_admin ||
        hasPermission(user, "admin.manage_users") ||
        hasPermission(user, "admin.manage_permissions")
      ) {
        return;
      }
    }
    router.replace(firstAllowedPath(user));
  }, [ready, user, pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--ds-gray-900)]">Loading FinOS…</p>
      </div>
    );
  }

  return (
    <TransactionModalProvider>
      <div className="h-dvh overflow-hidden bg-[var(--ds-background-100)]">
        <AppTopbar />
        <AppSidebar />
        <main
          className={cn(
            "h-[calc(100dvh-2.75rem)] translate-y-11 transition-[margin-left] duration-200 md:ml-[var(--app-sidebar-offset)]",
            isAiWorkspace
              ? "overflow-hidden p-0 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"
              : "app-scrollbar overflow-y-auto overscroll-contain px-3 py-4 pb-24 sm:px-6 sm:py-6 md:pb-10",
          )}
        >
          <div
            className={cn(
              isAiWorkspace
                ? "flex h-full w-full max-w-none flex-col"
                : "mx-auto w-full max-w-[var(--ds-page-width)]",
            )}
          >
            <NetworkStatusBanner />
            <div className={cn(isAiWorkspace && "min-h-0 flex-1")}>{children}</div>
          </div>
        </main>
        <MobileNav />
        <CommandPalette />
      </div>
    </TransactionModalProvider>
  );
}
