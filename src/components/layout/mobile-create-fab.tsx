"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTransactionModal } from "@/components/expenses/transaction-modal-provider";
import { useAuth } from "@/lib/auth-context";
import { canCrud } from "@/lib/permissions";

/** Thumb-friendly create control above the mobile tab bar. */
export function MobileCreateFab() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { openTransactionModal } = useTransactionModal();

  if (!canCrud(user, "expenses", "create")) return null;
  if (pathname === "/ai" || pathname.startsWith("/ai/")) return null;
  if (pathname.startsWith("/settings") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => openTransactionModal()}
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex size-12 items-center justify-center rounded-full bg-[var(--ds-gray-1000)] text-[var(--ds-primary-foreground)] shadow-[0_8px_24px_color-mix(in_srgb,var(--ds-gray-1000)_35%,transparent)] transition-transform active:scale-95 md:hidden ds-focus"
      aria-label="New transaction"
    >
      <Plus size={22} strokeWidth={2.2} />
    </button>
  );
}
