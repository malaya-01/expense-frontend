"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Calculator,
  ChartNoAxesCombined,
  CirclePlus,
  Command,
  Moon,
  Search,
  Settings,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV } from "./app-sidebar";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { listTransactions } from "@/lib/api/transactions";
import { listAccounts } from "@/lib/api/accounts";
import { listBudgets } from "@/lib/api/budgets";
import { listGoals } from "@/lib/api/goals";
import { listInvestments } from "@/lib/api/investments";

const OPEN_EVENT = "finos:open-command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

type PaletteItem = {
  id: string;
  title: string;
  subtitle: string;
  keywords: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  run: () => void;
};

function calculate(query: string): string | null {
  const percent = query.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*%\s+of\s+(-?\d+(?:\.\d+)?)\s*$/i,
  );
  if (percent) {
    return String((Number(percent[1]) / 100) * Number(percent[2]));
  }
  const arithmetic = query.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)\s*$/,
  );
  if (!arithmetic) return null;
  const left = Number(arithmetic[1]);
  const right = Number(arithmetic[3]);
  const value =
    arithmetic[2] === "+"
      ? left + right
      : arithmetic[2] === "-"
        ? left - right
        : arithmetic[2] === "*"
          ? left * right
          : right === 0
            ? Number.NaN
            : left / right;
  return Number.isFinite(value) ? String(value) : null;
}

function fuzzyMatch(value: string, query: string) {
  const haystack = value.toLowerCase();
  const needle = query.toLowerCase();
  if (!needle || haystack.includes(needle)) return true;
  let cursor = 0;
  for (const char of haystack) {
    if (char === needle[cursor]) cursor += 1;
    if (cursor === needle.length) return true;
  }
  return false;
}

export function CommandPalette() {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [recordItems, setRecordItems] = useState<PaletteItem[]>([]);
  const [indexLoaded, setIndexLoaded] = useState(false);
  const [indexing, setIndexing] = useState(false);

  useEffect(() => {
    const openPalette = () => {
      previousFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    };
    const onGlobalKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        router.push("/expenses/new");
      }
    };
    window.addEventListener(OPEN_EVENT, openPalette);
    window.addEventListener("keydown", onGlobalKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, openPalette);
      window.removeEventListener("keydown", onGlobalKey);
    };
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setQuery("");
    setActiveIndex(0);
    window.requestAnimationFrame(() => inputRef.current?.focus());
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab") {
        const focusable = Array.from(
          paletteRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) || [],
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open || indexLoaded || indexing || !user?.id) return;
    setIndexing(true);
    Promise.all([
      listTransactions().catch(() => []),
      listAccounts(user.id).catch(() => []),
      listBudgets().catch(() => []),
      listGoals().catch(() => []),
      listInvestments().catch(() => null),
    ]).then(([transactions, accounts, budgets, goals, investments]) => {
      const records: PaletteItem[] = [
        ...transactions.map((transaction) => ({
          id: `transaction-${transaction.id}`,
          title: transaction.description,
          subtitle: `${transaction.type} · ${transaction.merchant || transaction.category_name || transaction.date}`,
          keywords: `${transaction.type} ${transaction.merchant || ""} ${transaction.category_name || ""} ${transaction.notes || ""}`,
          icon: CirclePlus,
          run: () => router.push(`/expenses/${transaction.id}`),
        })),
        ...accounts.map((account) => ({
          id: `account-${account.id}`,
          title: account.name,
          subtitle: `Account · ${account.type} · ${account.currency}`,
          keywords: `container account wallet bank ${account.type} ${account.institution || ""}`,
          icon: WalletCards,
          run: () => router.push("/accounts"),
        })),
        ...budgets.map((budget) => ({
          id: `budget-${budget.id}`,
          title: budget.name,
          subtitle: `Budget · ${budget.status.replace("_", " ")}`,
          keywords: `budget ${budget.category_name || ""} ${budget.period_type}`,
          icon: ChartNoAxesCombined,
          run: () => router.push("/budgets"),
        })),
        ...goals.map((goal) => ({
          id: `goal-${goal.id}`,
          title: goal.name,
          subtitle: `Goal · ${goal.status.replace("_", " ")} · ${goal.percent.toFixed(0)}%`,
          keywords: `goal target ${goal.goal_type} ${goal.notes || ""}`,
          icon: Target,
          run: () => router.push("/goals"),
        })),
        ...(investments?.holdings || []).map((holding) => ({
          id: `holding-${holding.id}`,
          title: holding.name,
          subtitle: `Investment · ${holding.symbol || holding.asset_type}`,
          keywords: `investment holding ${holding.symbol || ""} ${holding.asset_type}`,
          icon: TrendingUp,
          run: () => router.push("/investments"),
        })),
      ];
      setRecordItems(records);
      setIndexLoaded(true);
      setIndexing(false);
    });
  }, [open, indexLoaded, indexing, router, user?.id]);

  const closeAndRun = (run: () => void) => {
    setOpen(false);
    run();
  };

  const items = useMemo<PaletteItem[]>(() => {
    const navigation = [...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => ({
      id: `nav-${item.href}`,
      title: item.label,
      subtitle: "Go to module",
      keywords: `${item.label} navigation open`,
      icon: item.icon,
      run: () => router.push(item.href),
    }));
    return [
      {
        id: "new-transaction",
        title: "New transaction",
        subtitle: "Record expense, income, or transfer",
        keywords: "add create expense income transfer",
        icon: CirclePlus,
        run: () => router.push("/expenses/new"),
      },
      {
        id: "ask-advisor",
        title: "Ask AI Advisor",
        subtitle: "Open your Personal CFO workspace",
        keywords: "ai assistant advisor ask",
        icon: Command,
        run: () => router.push("/ai"),
      },
      {
        id: "appearance",
        title: "Appearance settings",
        subtitle: "Themes, contrast, and visual preferences",
        keywords: "theme dark light color appearance",
        icon: Moon,
        run: () => router.push("/settings?section=appearance"),
      },
      {
        id: "settings",
        title: "Open settings",
        subtitle: "Configure FinOS",
        keywords: "preferences configuration settings",
        icon: Settings,
        run: () => router.push("/settings"),
      },
      ...navigation,
      ...recordItems,
    ];
  }, [router, recordItems]);

  const normalized = query.trim().toLowerCase();
  const filtered = items.filter((item) =>
    fuzzyMatch(`${item.title} ${item.subtitle} ${item.keywords}`, normalized),
  );
  const result = calculate(query);
  const visibleItems: PaletteItem[] = result
    ? [
        {
          id: "calculation",
          title: result,
          subtitle: `Result of ${query.trim()}`,
          keywords: "",
          icon: Calculator,
          run: () => void navigator.clipboard?.writeText(result),
        },
        ...filtered,
      ]
    : filtered;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-start justify-center px-3 pt-[10vh] sm:pt-[14vh]">
      <button
        type="button"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
      />
      <section
        ref={paletteRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[16px] bg-[var(--ds-background-elevated)] ds-border-modal ds-strong-border ds-overlay-enter"
      >
        <div className="flex h-14 items-center gap-3 border-b border-[var(--ds-gray-200)] px-4">
          <Search size={18} className="shrink-0 text-[var(--ds-gray-700)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) =>
                  Math.min(index + 1, visibleItems.length - 1),
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                const selected = visibleItems[activeIndex];
                if (selected) closeAndRun(selected.run);
              }
            }}
            placeholder="Search modules, run a command, or calculate…"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--ds-gray-1000)] outline-none placeholder:text-[var(--ds-gray-700)]"
            aria-controls="finos-command-results"
          />
          <kbd className="rounded-[6px] bg-[var(--ds-background-200)] px-2 py-1 font-mono text-[10px] text-[var(--ds-gray-700)]">
            ESC
          </kbd>
        </div>
        <div
          id="finos-command-results"
          role="listbox"
          className="max-h-[min(420px,60vh)] overflow-y-auto p-2"
        >
          {indexing && normalized ? (
            <div className="px-5 py-3 text-center text-[11px] text-[var(--ds-gray-700)]">
              Searching your financial records…
            </div>
          ) : null}
          {visibleItems.length ? (
            visibleItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => closeAndRun(item.run)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left ds-focus",
                  index === activeIndex
                    ? "bg-[var(--ds-gray-100)]"
                    : "hover:bg-[var(--ds-background-100)]",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-[var(--ds-background-100)] text-[var(--ds-gray-900)] ds-border">
                  <item.icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-[var(--ds-gray-1000)]">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--ds-gray-700)]">
                    {item.subtitle}
                  </span>
                </span>
                {index === activeIndex ? (
                  <kbd className="text-[10px] text-[var(--ds-gray-700)]">↵</kbd>
                ) : null}
              </button>
            ))
          ) : (
            <div className="px-5 py-12 text-center">
              <Search
                size={24}
                className="mx-auto text-[var(--ds-gray-700)]"
              />
              <p className="mt-3 text-sm font-medium">No matching command</p>
              <p className="mt-1 text-xs text-[var(--ds-gray-700)]">
                Try a module name, action, or calculation such as 18% of 45000.
              </p>
            </div>
          )}
        </div>
        <footer className="flex items-center justify-between border-t border-[var(--ds-gray-200)] px-4 py-2 text-[10px] text-[var(--ds-gray-700)]">
          <span>↑↓ Navigate · Enter open</span>
          <span>Ctrl N · New transaction</span>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
