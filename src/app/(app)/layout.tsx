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
  const isFullBleedWorkspace = isAiWorkspace;

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated && !getAccessToken()) {
      router.replace("/signin");
      return;
    }
    if (isAuthenticated || getAccessToken()) {
      void bootstrapOfflineSync(user?.id);
      void fetchMyPermissions()
        .then((perms) => {
          if (!perms || typeof perms !== "object") return;
          setPermissions({
            is_admin: Boolean(perms.is_admin),
            permissions: Array.isArray(perms.permissions)
              ? perms.permissions
              : [],
          });
        })
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

  return (
    <TransactionModalProvider>
      <div className="h-dvh overflow-hidden bg-[var(--ds-background-100)]">
        <AppTopbar />
        <AppSidebar />
        <main
          className={cn(
            "h-[calc(100dvh-2.75rem)] translate-y-11 transition-[margin-left] duration-200 md:ml-[var(--app-sidebar-offset)]",
            isFullBleedWorkspace
              ? "overflow-hidden p-0 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0"
              : "app-scrollbar overflow-x-hidden overflow-y-auto overscroll-contain scroll-pt-3 px-3 pt-5 pb-[calc(6.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 sm:pb-6 md:pb-10",
          )}
        >
          <div
            className={cn(
              isFullBleedWorkspace
                ? "flex h-full w-full max-w-none flex-col"
                : "mx-auto w-full min-w-0 max-w-[var(--ds-page-width)]",
            )}
          >
            <NetworkStatusBanner />
            <div className={cn(isFullBleedWorkspace && "min-h-0 flex-1")}>
              {children}
            </div>
          </div>
        </main>
        <MobileNav />
        <CommandPalette />
      </div>
    </TransactionModalProvider>
  );
}
