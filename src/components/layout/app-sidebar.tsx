"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  FileChartColumn,
  LayoutDashboard,
  Landmark,
  Settings,
  Sparkles,
  Tags,
  Target,
  TrendingUp,
  WalletCards,
  Menu,
  LogOut,
  PanelLeftClose,
  Pin,
  Plus,
  Repeat2,
  Search,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { resolveAvatarUrl } from "@/lib/api/user";
import { Drawer } from "@/components/ui/drawer";
import { NotificationCenter } from "@/components/layout/notification-center";
import { ThemeMenu } from "@/components/layout/theme-menu";
import { openCommandPalette } from "@/components/layout/command-palette";
import { SpacesSidebarSection } from "@/components/layout/spaces-sidebar-section";
import { useTransactionModal } from "@/components/expenses/transaction-modal-provider";
import { useAuth } from "@/lib/auth-context";
import { initials } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  selectSidebarVisible,
  setMobileNavOpen,
  setSidebarPeeking,
  setSidebarPinned,
  setSidebarResizing,
  setSidebarWidth,
  toggleSidebarPinned,
} from "@/lib/store/slices/uiSlice";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: WalletCards },
  { href: "/expenses", label: "Transactions", icon: ArrowLeftRight },
  { href: "/recurring", label: "Recurring", icon: Repeat2 },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/loans", label: "Loans & Debts", icon: Landmark },
  { href: "/budgets", label: "Budgets", icon: ChartNoAxesCombined },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/reports", label: "Reports", icon: FileChartColumn },
  { href: "/ai", label: "AI Advisor", icon: Sparkles },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({
  item,
  collapsed = false,
  onNavigate,
}: {
  item: NavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active =
    pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex min-h-8 items-center rounded-[7px] text-[12px] transition-colors ds-focus",
        collapsed ? "justify-center px-2" : "justify-between px-2",
        "text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]",
        active && "bg-[var(--ds-gray-100)] font-medium text-[var(--ds-gray-1000)]",
      )}
    >
      <span className="flex items-center gap-2.5">
        <item.icon
          size={15}
          strokeWidth={1.8}
          className={cn(
            "text-[var(--ds-gray-700)] group-hover:text-[var(--ds-gray-1000)]",
            active && "text-[var(--ds-focus-color)]",
          )}
        />
        {!collapsed ? item.label : null}
      </span>
      {item.soon && !collapsed ? (
        <span className="text-[10px] uppercase tracking-wide text-[var(--ds-gray-700)]">
          Soon
        </span>
      ) : null}
    </Link>
  );
}

function SidebarContents({
  onNavigate,
  onHide,
  onPin,
  pinned,
}: {
  onNavigate?: () => void;
  onHide?: () => void;
  onPin?: () => void;
  pinned?: boolean;
}) {
  const router = useRouter();
  const { openTransactionModal } = useTransactionModal();
  const { user, logout } = useAuth();

  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-2 px-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-[7px] px-1 py-1 text-[13px] font-medium text-[var(--ds-gray-1000)] ds-focus"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--ds-gray-1000)] text-[10px] text-[var(--ds-primary-foreground)]">
            F
          </span>
          <span className="truncate">{user?.full_name || "FinOS workspace"}</span>
        </Link>
        {onPin ? (
          <button
            type="button"
            onClick={onPin}
            className="flex size-7 items-center justify-center rounded-[6px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
            aria-label={pinned ? "Hide sidebar" : "Pin sidebar"}
            title={pinned ? "Hide sidebar (Ctrl+\\)" : "Pin sidebar"}
          >
            {pinned ? <PanelLeftClose size={15} /> : <Pin size={14} />}
          </button>
        ) : null}
      </div>

      <div className="space-y-1 px-2 pb-2">
        <button
          type="button"
          onClick={() => {
            openCommandPalette();
            onNavigate?.();
          }}
          className="flex min-h-8 w-full items-center gap-2 rounded-[7px] px-2 text-left text-[12px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
        >
          <Search size={14} />
          <span className="flex-1">Search</span>
          <kbd className="text-[10px] text-[var(--ds-gray-700)]">Ctrl K</kbd>
        </button>
        <button
          type="button"
          onClick={() => {
            openTransactionModal();
            onNavigate?.();
          }}
          className="flex min-h-8 w-full items-center gap-2 rounded-[7px] px-2 text-left text-[12px] text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
        >
          <Plus size={14} />
          New transaction
        </button>
      </div>

      <nav className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-0.5">
          <p className="mb-1 px-2 text-[10px] font-medium text-[var(--ds-gray-700)]">
            Finance
          </p>
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
        <SpacesSidebarSection onNavigate={onNavigate} />
        <div className="mt-5 space-y-0.5">
          <p className="mb-1 px-2 text-[10px] font-medium text-[var(--ds-gray-700)]">
            Workspace
          </p>
          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>

      <div className="shrink-0 space-y-1 border-t border-[var(--ds-gray-200)] p-2">
        <div className="flex items-center gap-1">
          <NotificationCenter />
          <ThemeMenu showCreateLink />
        </div>
        <div className="flex items-center gap-2 rounded-[8px] px-2 py-2">
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-[6px] text-left ds-focus"
            title="Open profile"
          >
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveAvatarUrl(user.avatar_url) || undefined}
                alt=""
                className="size-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--ds-background-200)] text-[10px] font-medium text-[var(--ds-gray-1000)]">
                {initials(user?.full_name, user?.email)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-[var(--ds-gray-1000)]">
                {user?.full_name || "FinOS user"}
              </p>
              <p className="truncate text-[10px] text-[var(--ds-gray-700)]">
                {user?.email}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/signin");
            }}
            className="flex size-7 items-center justify-center rounded-[6px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={14} />
          </button>
        </div>
        {onHide ? (
          <button
            type="button"
            onClick={onHide}
            className="flex min-h-8 w-full items-center gap-2 rounded-[7px] px-2 text-[11px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
          >
            <PanelLeftClose size={14} />
            Hide sidebar
            <kbd className="ml-auto text-[9px]">Ctrl \</kbd>
          </button>
        ) : null}
      </div>
    </>
  );
}

export function AppSidebar() {
  const dispatch = useAppDispatch();
  const pinned = useAppSelector((state) => state.ui.sidebarPinned);
  const peeking = useAppSelector((state) => state.ui.sidebarPeeking);
  const width = useAppSelector((state) => state.ui.sidebarWidth);
  const resizing = useAppSelector((state) => state.ui.sidebarResizing);
  const visible = useAppSelector(selectSidebarVisible);
  const resizingRef = useRef(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "\\") {
        event.preventDefault();
        dispatch(toggleSidebarPinned());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!resizingRef.current) return;
      dispatch(setSidebarWidth(event.clientX));
    };
    const stopResize = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      dispatch(setSidebarResizing(false));
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResize);
    };
  }, [dispatch]);

  return (
    <>
      {!pinned ? (
        <div
          className="fixed bottom-0 left-0 top-11 z-40 hidden w-2 md:block"
          onPointerEnter={() => dispatch(setSidebarPeeking(true))}
          aria-hidden
        />
      ) : null}
      <aside
        onPointerLeave={() => {
          if (!pinned && !resizingRef.current) {
            dispatch(setSidebarPeeking(false));
          }
        }}
        className={cn(
          "fixed z-50 hidden flex-col overflow-hidden bg-[var(--ds-background-elevated)] transition-[transform,opacity,border-radius] duration-200 md:flex",
          pinned
            ? "bottom-0 left-0 top-11 rounded-none [box-shadow:1px_0_0_0_color-mix(in_srgb,var(--ds-gray-1000)_14%,transparent)]"
            : "bottom-3 left-2 top-[3.25rem] rounded-[12px] border border-[color:color-mix(in_srgb,var(--ds-gray-1000)_14%,transparent)]",
          !visible && "-translate-x-[110%] opacity-0",
          peeking &&
            !pinned &&
            "[box-shadow:0_12px_36px_rgba(0,0,0,0.22),0_2px_8px_rgba(0,0,0,0.12)]",
        )}
        style={{ width: pinned ? width : Math.min(width, 232) }}
        aria-label="Main sidebar"
      >
        <SidebarContents
          pinned={pinned}
          onPin={() => dispatch(setSidebarPinned(!pinned))}
          onHide={() => dispatch(setSidebarPinned(false))}
        />
        {pinned ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            className="absolute inset-y-0 right-[-3px] w-[6px] cursor-col-resize touch-none"
            onPointerDown={(event) => {
              event.preventDefault();
              resizingRef.current = true;
              dispatch(setSidebarResizing(true));
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
          />
        ) : null}
      </aside>
      {resizing ? <span className="sr-only">Resizing sidebar</span> : null}
    </>
  );
}

export function MobileNav() {
  const dispatch = useAppDispatch();
  const moreOpen = useAppSelector((state) => state.ui.mobileNavOpen);
  const items = [
    PRIMARY_NAV.find((item) => item.href === "/dashboard")!,
    PRIMARY_NAV.find((item) => item.href === "/expenses")!,
    PRIMARY_NAV.find((item) => item.href === "/ai")!,
    PRIMARY_NAV.find((item) => item.href === "/accounts")!,
  ];
  const pathname = usePathname();

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex gap-1 bg-[var(--ds-background-elevated)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden [box-shadow:0_-1px_0_0_color-mix(in_srgb,var(--ds-gray-1000)_14%,transparent)]">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-[9px] px-1 py-1.5 text-[10px]",
                active
                  ? "bg-[var(--ds-gray-100)] text-[var(--ds-gray-1000)]"
                  : "text-[var(--ds-gray-900)]",
              )}
            >
              <item.icon size={17} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => dispatch(setMobileNavOpen(true))}
          className="flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-[9px] px-1 py-1.5 text-[10px] text-[var(--ds-gray-900)]"
          aria-label="Open all modules"
        >
          <Menu size={17} strokeWidth={1.8} />
          More
        </button>
      </nav>
      <Drawer
        open={moreOpen}
        side="left"
        title="FinOS"
        onClose={() => dispatch(setMobileNavOpen(false))}
      >
        <div className="-m-5 flex h-[calc(100dvh-4rem)] flex-col">
          <SidebarContents
            onNavigate={() => dispatch(setMobileNavOpen(false))}
          />
        </div>
      </Drawer>
    </>
  );
}
