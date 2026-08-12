"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  GUIDE_CHAPTERS,
  GUIDE_GROUPS,
  getGuideNeighbors,
  type GuideChapter,
} from "@/lib/guide/chapters";

function SidebarNav({ activeSlug }: { activeSlug?: string }) {
  return (
    <nav aria-label="Guide chapters" className="space-y-5">
      <Link
        href="/guide"
        className={cn(
          "flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-sm transition-colors",
          !activeSlug
            ? "bg-[var(--ds-gray-100)] font-semibold text-[var(--ds-gray-1000)]"
            : "text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]",
        )}
      >
        <BookOpen size={15} />
        Guide overview
      </Link>

      {GUIDE_GROUPS.map((group) => {
        const chapters = GUIDE_CHAPTERS.filter((c) => c.group === group.id);
        if (!chapters.length) return null;
        return (
          <div key={group.id}>
            <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-gray-700)]">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {chapters.map((chapter) => {
                const active = activeSlug === chapter.slug;
                const Icon = chapter.icon;
                return (
                  <li key={chapter.slug}>
                    <Link
                      href={`/guide/${chapter.slug}`}
                      className={cn(
                        "flex items-center gap-2 rounded-[9px] px-2.5 py-1.5 text-[13px] leading-5 transition-colors",
                        active
                          ? "bg-[var(--ds-gray-100)] font-medium text-[var(--ds-gray-1000)]"
                          : "text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]",
                      )}
                    >
                      <Icon size={14} className="shrink-0 opacity-80" />
                      <span className="truncate">{chapter.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function ChapterPager({ chapter }: { chapter: GuideChapter }) {
  const { prev, next, index } = getGuideNeighbors(chapter.slug);
  return (
    <footer className="mt-12 border-t border-[var(--ds-gray-200)] pt-6">
      <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--ds-gray-700)]">
        Chapter {index + 1} of {GUIDE_CHAPTERS.length}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/guide/${prev.slug}`}
            className="group flex items-start gap-3 rounded-[12px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] px-4 py-3.5 transition-colors hover:border-[var(--ds-gray-400)]"
          >
            <ArrowLeft
              size={16}
              className="mt-0.5 shrink-0 text-[var(--ds-gray-700)] group-hover:text-[var(--ds-gray-1000)]"
            />
            <div className="min-w-0">
              <p className="text-[11px] text-[var(--ds-gray-700)]">Previous</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
                {prev.title}
              </p>
            </div>
          </Link>
        ) : (
          <Link
            href="/guide"
            className="group flex items-start gap-3 rounded-[12px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] px-4 py-3.5 transition-colors hover:border-[var(--ds-gray-400)]"
          >
            <ArrowLeft
              size={16}
              className="mt-0.5 shrink-0 text-[var(--ds-gray-700)]"
            />
            <div>
              <p className="text-[11px] text-[var(--ds-gray-700)]">Previous</p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--ds-gray-1000)]">
                Guide overview
              </p>
            </div>
          </Link>
        )}
        {next ? (
          <Link
            href={`/guide/${next.slug}`}
            className="group flex items-start justify-end gap-3 rounded-[12px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] px-4 py-3.5 text-right transition-colors hover:border-[var(--ds-gray-400)] sm:col-start-2"
          >
            <div className="min-w-0">
              <p className="text-[11px] text-[var(--ds-gray-700)]">Next</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
                {next.title}
              </p>
            </div>
            <ArrowRight
              size={16}
              className="mt-0.5 shrink-0 text-[var(--ds-gray-700)] group-hover:text-[var(--ds-gray-1000)]"
            />
          </Link>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>
    </footer>
  );
}

export function GuideShell({
  chapter,
  children,
}: {
  chapter?: GuideChapter;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const activeSlug = chapter?.slug;

  return (
    <div className="flex h-full min-h-0 bg-[var(--ds-background-100)]">
      <aside
        className="hidden h-full w-[272px] shrink-0 flex-col border-r border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] bg-[var(--ds-background-100)] lg:flex"
        aria-label="Guide navigation"
      >
        <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--ds-gray-700)]">
            Guide
          </p>
        </div>
        <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          <SidebarNav activeSlug={activeSlug} />
        </div>
      </aside>

      <div className="app-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-16 sm:px-8 sm:py-6">
          <nav
            aria-label="Guide chapters"
            className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden"
          >
            <Link
              href="/guide"
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                pathname === "/guide"
                  ? "border-[var(--ds-gray-1000)] bg-[var(--ds-gray-1000)] text-[var(--ds-primary-foreground)]"
                  : "border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] text-[var(--ds-gray-900)]",
              )}
            >
              Overview
            </Link>
            {GUIDE_CHAPTERS.map((item) => (
              <Link
                key={item.slug}
                href={`/guide/${item.slug}`}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                  activeSlug === item.slug
                    ? "border-[var(--ds-gray-1000)] bg-[var(--ds-gray-1000)] text-[var(--ds-primary-foreground)]"
                    : "border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] text-[var(--ds-gray-900)]",
                )}
              >
                {item.title}
              </Link>
            ))}
          </nav>

          {children}
          {chapter ? <ChapterPager chapter={chapter} /> : null}
        </div>
      </div>
    </div>
  );
}

export function GuideChapterHeader({
  chapter,
}: {
  chapter: GuideChapter;
}) {
  const Icon = chapter.icon;
  const { index } = getGuideNeighbors(chapter.slug);
  return (
    <header className="mb-8 rounded-[16px] border border-[var(--ds-gray-200)] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--ds-focus-color)_10%,transparent),transparent_55%),var(--ds-background-elevated)] px-5 py-6 sm:px-7 sm:py-7">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-[var(--ds-gray-700)]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] px-2.5 py-1 text-[var(--ds-gray-900)]">
          <Icon size={12} />
          Guide
        </span>
        <span>
          Chapter {index + 1} of {GUIDE_CHAPTERS.length}
        </span>
      </div>
      <h1 className="mt-3 text-[26px] font-semibold tracking-[-0.04em] text-[var(--ds-gray-1000)] sm:text-[32px]">
        {chapter.title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--ds-gray-900)] sm:text-[15px]">
        {chapter.summary}
      </p>
      {chapter.appHref ? (
        <Link
          href={chapter.appHref}
          className="mt-4 inline-flex items-center rounded-[9px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] px-3.5 py-2 text-sm font-medium text-[var(--ds-gray-1000)] hover:border-[var(--ds-gray-400)]"
        >
          Open in app
        </Link>
      ) : null}
    </header>
  );
}
