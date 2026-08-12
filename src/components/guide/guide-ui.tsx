import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Lightbulb, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function Callout({
  tone = "tip",
  title,
  children,
}: {
  tone?: "tip" | "note" | "warn";
  title: string;
  children: ReactNode;
}) {
  const Icon =
    tone === "warn" ? TriangleAlert : tone === "note" ? BookOpen : Lightbulb;
  const styles =
    tone === "warn"
      ? "border-[color:color-mix(in_srgb,var(--ds-status-red)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--ds-status-red)_8%,transparent)]"
      : tone === "note"
        ? "border-[color:color-mix(in_srgb,var(--ds-focus-color)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--ds-focus-color)_8%,transparent)]"
        : "border-[color:color-mix(in_srgb,var(--ds-status-green)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--ds-status-green)_8%,transparent)]";
  return (
    <aside className={cn("my-5 rounded-[12px] border px-4 py-3.5 sm:px-5 sm:py-4", styles)}>
      <div className="flex items-start gap-3">
        <Icon size={18} className="mt-0.5 shrink-0 text-[var(--ds-gray-1000)]" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--ds-gray-1000)]">{title}</p>
          <div className="mt-1 text-sm leading-6 text-[var(--ds-gray-900)]">
            {children}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="relative flex gap-3 sm:gap-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--ds-gray-1000)] text-xs font-bold text-[var(--ds-background-100)]">
        {n}
      </span>
      <div className="min-w-0 pb-5">
        <p className="text-sm font-semibold text-[var(--ds-gray-1000)]">{title}</p>
        <div className="mt-1 text-sm leading-6 text-[var(--ds-gray-900)]">
          {children}
        </div>
      </div>
    </li>
  );
}

export function FlowCard({
  icon: Icon,
  label,
  href,
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
}) {
  const body = (
    <>
      <Icon size={18} className="text-[var(--ds-gray-1000)]" />
      <span className="mt-2 text-xs font-medium text-[var(--ds-gray-1000)]">
        {label}
      </span>
    </>
  );
  const className =
    "flex min-h-[4.5rem] flex-col items-center justify-center rounded-[12px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] px-3 py-3 text-center transition-colors hover:border-[var(--ds-gray-400)]";
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[6px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ds-gray-1000)]">
      {children}
    </kbd>
  );
}

export function DocH2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-8 border-b border-[var(--ds-gray-200)] pb-2 text-lg font-semibold tracking-[-0.02em] text-[var(--ds-gray-1000)] first:mt-0">
      {children}
    </h2>
  );
}

export function DocH3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-6 text-base font-semibold text-[var(--ds-gray-1000)]">
      {children}
    </h3>
  );
}

export function DocP({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-sm leading-7 text-[var(--ds-gray-900)] sm:text-[15px]">
      {children}
    </p>
  );
}

export function DocList({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--ds-gray-900)]">
      {children}
    </ul>
  );
}

export function DocOl({ children }: { children: ReactNode }) {
  return (
    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[var(--ds-gray-900)]">
      {children}
    </ol>
  );
}

export function InlineLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-medium text-[var(--ds-link-color)] underline decoration-[color:color-mix(in_srgb,var(--ds-link-color)_35%,transparent)] underline-offset-2 hover:text-[var(--ds-link-hover)] hover:decoration-[var(--ds-link-hover)]"
    >
      {children}
    </Link>
  );
}

export function FeatureGrid({
  items,
}: {
  items: Array<{ title: string; body: string }>;
}) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-[14px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] p-4"
        >
          <p className="text-sm font-semibold text-[var(--ds-gray-1000)]">
            {item.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--ds-gray-900)]">
            {item.body}
          </p>
        </div>
      ))}
    </div>
  );
}

export function RelatedLinks({
  items,
}: {
  items: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="inline-flex items-center rounded-[9px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] px-3 py-1.5 text-xs font-medium text-[var(--ds-gray-1000)] hover:border-[var(--ds-gray-400)]"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
