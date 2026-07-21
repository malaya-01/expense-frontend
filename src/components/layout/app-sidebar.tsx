"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Drawer } from "@/components/ui/drawer";
import { NotificationCenter } from "@/components/layout/notification-center";
import { ThemeMenu } from "@/components/layout/theme-menu";
import { openCommandPalette } from "@/components/layout/command-palette";
import { useAuth } from "@/lib/auth-context";
import { initials } from "@/lib/format";

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

const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 420;
const DEFAULT_SIDEBAR_WIDTH = 260;

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
            router.push("/expenses/new");
            onNavigate?.();
          }}
          className="flex min-h-8 w-full items-center gap-2 rounded-[7px] px-2 text-left text-[12px] text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
        >
          <Plus size={14} />
          New transaction
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-0.5">
          <p className="mb-1 px-2 text-[10px] font-medium text-[var(--ds-gray-700)]">
            Finance
          </p>
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
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
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--ds-background-200)] text-[10px] font-medium text-[var(--ds-gray-1000)]">
            {initials(user?.full_name, user?.email)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-[var(--ds-gray-1000)]">
              {user?.full_name || "FinOS user"}
            </p>
            <p className="truncate text-[10px] text-[var(--ds-gray-700)]">
              {user?.email}
            </p>
          </div>
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
  const [pinned, setPinned] = useState(true);
  const [peeking, setPeeking] = useState(false);
  const [width, setWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const resizingRef = useRef(false);

  const syncOffset = useCallback((isPinned: boolean, nextWidth: number) => {
    document.documentElement.style.setProperty(
      "--app-sidebar-offset",
      isPinned ? `${nextWidth}px` : "0px",
    );
  }, []);

  useEffect(() => {
    const savedPinned = localStorage.getItem("finos:sidebar-pinned") !== "false";
    const savedWidth = Number(localStorage.getItem("finos:sidebar-width"));
    const nextWidth = Number.isFinite(savedWidth)
      ? Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, savedWidth))
      : DEFAULT_SIDEBAR_WIDTH;
    setPinned(savedPinned);
    setWidth(nextWidth);
    syncOffset(savedPinned, nextWidth);
  }, [syncOffset]);

  const setPinnedState = useCallback(
    (next: boolean) => {
      setPinned(next);
      setPeeking(false);
      localStorage.setItem("finos:sidebar-pinned", String(next));
      syncOffset(next, width);
    },
    [syncOffset, width],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "\\") {
        event.preventDefault();
        setPinnedState(!pinned);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pinned, setPinnedState]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!resizingRef.current) return;
      const next = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, event.clientX),
      );
      setWidth(next);
      localStorage.setItem("finos:sidebar-width", String(next));
      syncOffset(pinned, next);
    };
    const stopResize = () => {
      resizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResize);
    };
  }, [pinned, syncOffset]);

  const visible = pinned || peeking;

  return (
    <>
      {!pinned ? (
        <div
          className="fixed inset-y-0 left-0 z-40 hidden w-2 md:block"
          onPointerEnter={() => setPeeking(true)}
          aria-hidden
        />
      ) : null}
      <aside
        onPointerLeave={() => {
          if (!pinned && !resizingRef.current) setPeeking(false);
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden flex-col bg-[var(--ds-background-elevated)] transition-transform duration-200 md:flex",
          "[box-shadow:1px_0_0_0_color-mix(in_srgb,var(--ds-gray-1000)_14%,transparent)]",
          !visible && "-translate-x-full",
          peeking &&
            !pinned &&
            "[box-shadow:1px_0_0_0_color-mix(in_srgb,var(--ds-gray-1000)_14%,transparent),12px_0_32px_rgba(0,0,0,0.14)]",
        )}
        style={{ width }}
        aria-label="Main sidebar"
      >
        <SidebarContents
          pinned={pinned}
          onPin={() => setPinnedState(!pinned)}
          onHide={() => setPinnedState(false)}
        />
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          className="absolute inset-y-0 right-[-3px] w-[6px] cursor-col-resize touch-none"
          onPointerDown={(event) => {
            event.preventDefault();
            resizingRef.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
        />
      </aside>
    </>
  );
}

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
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
          onClick={() => setMoreOpen(true)}
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
        onClose={() => setMoreOpen(false)}
      >
        <div className="-m-5 flex h-[calc(100dvh-4rem)] flex-col">
          <SidebarContents onNavigate={() => setMoreOpen(false)} />
        </div>
      </Drawer>
    </>
  );
}
