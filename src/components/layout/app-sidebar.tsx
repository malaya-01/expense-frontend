"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type NavItem = {
  href: string;
  label: string;
  soon?: boolean;
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/expenses", label: "Transactions" },
  { href: "/investments", label: "Investments", soon: true },
  { href: "/budgets", label: "Budgets", soon: true },
  { href: "/goals", label: "Goals", soon: true },
  { href: "/reports", label: "Reports", soon: true },
  { href: "/ai", label: "AI Advisor", soon: true },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/categories", label: "Categories" },
  { href: "/settings", label: "Settings" },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active =
    pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center justify-between rounded-[6px] px-3 py-2 text-[13px] ds-focus",
        "text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]",
        active && "bg-[var(--ds-gray-100)] font-medium text-[var(--ds-gray-1000)]",
      )}
    >
      <span>{item.label}</span>
      {item.soon ? (
        <span className="text-[10px] uppercase tracking-wide text-[var(--ds-gray-700)]">
          Soon
        </span>
      ) : null}
    </Link>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-[var(--sidebar-width)] shrink-0 flex-col border-r-0 bg-[var(--ds-background-100)] md:flex ds-header-rule [box-shadow:1px_0_0_0_rgba(0,0,0,0.08)]">
      <div className="flex h-14 items-center px-5">
        <Link
          href="/dashboard"
          className="text-sm font-semibold tracking-[-0.28px] text-[var(--ds-gray-1000)] ds-focus rounded-[6px]"
        >
          FinOS
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-6">
        <div className="space-y-0.5">
          <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wide text-[var(--ds-gray-700)]">
            Operate
          </p>
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <div className="space-y-0.5">
          <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wide text-[var(--ds-gray-700)]">
            System
          </p>
          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const items = [...PRIMARY_NAV.slice(0, 4), { href: "/settings", label: "More" }];
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex gap-1 bg-[var(--ds-background-elevated)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden ds-header-rule [box-shadow:0_-1px_0_0_rgba(0,0,0,0.08)]">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center rounded-[6px] px-1 py-2 text-[11px]",
              active
                ? "bg-[var(--ds-gray-100)] text-[var(--ds-gray-1000)]"
                : "text-[var(--ds-gray-900)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
