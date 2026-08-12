"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Menu, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/cn";
import { Drawer } from "@/components/ui/drawer";
import { DOCUMENTATION_BASE, documentationPath } from "@/lib/docs/portal";
import {
  GUIDE_CHAPTERS,
  GUIDE_GROUPS,
  getGuideNeighbors,
  type GuideChapter,
} from "@/lib/guide/chapters";

function SidebarNav({
  activeSlug,
  onNavigate,
}: {
  activeSlug?: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Documentation chapters" className="space-y-5">
      <Link
        href={DOCUMENTATION_BASE}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-sm transition-colors",
          !activeSlug
            ? "bg-[var(--ds-gray-100)] font-semibold text-[var(--ds-gray-1000)]"
            : "text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]",
        )}
      >
        <BookOpen size={15} />
        Documentation overview
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
                      href={documentationPath(chapter.slug)}
                      onClick={onNavigate}
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
            href={documentationPath(prev.slug)}
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
            href={DOCUMENTATION_BASE}
            className="group flex items-start gap-3 rounded-[12px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] px-4 py-3.5 transition-colors hover:border-[var(--ds-gray-400)]"
          >
            <ArrowLeft
              size={16}
              className="mt-0.5 shrink-0 text-[var(--ds-gray-700)]"
            />
            <div>
              <p className="text-[11px] text-[var(--ds-gray-700)]">Previous</p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--ds-gray-1000)]">
                Documentation overview
              </p>
            </div>
          </Link>
        )}
        {next ? (
          <Link
            href={documentationPath(next.slug)}
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
  const activeSlug = chapter?.slug;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeSlug]);

  return (
    <div className="flex h-full min-h-0 bg-[var(--ds-background-100)]">
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col border-r border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] bg-[var(--ds-background-100)] transition-[width] duration-200 lg:flex",
          desktopCollapsed ? "w-14" : "w-[272px]",
        )}
        aria-label="Documentation navigation"
      >
        <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
          {!desktopCollapsed ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--ds-gray-700)]">
              Documentation
            </p>
          ) : (
            <span className="sr-only">Documentation</span>
          )}
          <button
            type="button"
            onClick={() => setDesktopCollapsed((v) => !v)}
            className="flex size-8 items-center justify-center rounded-[7px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
            aria-label={
              desktopCollapsed ? "Expand documentation sidebar" : "Collapse documentation sidebar"
            }
            title={desktopCollapsed ? "Expand" : "Collapse"}
          >
            {desktopCollapsed ? <Menu size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        {!desktopCollapsed ? (
          <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            <SidebarNav activeSlug={activeSlug} />
          </div>
        ) : null}
      </aside>

      <div className="app-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] bg-[var(--ds-background-100)] px-3 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex items-center gap-2 rounded-[9px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] px-3 py-2 text-sm font-medium text-[var(--ds-gray-1000)] ds-focus"
            aria-expanded={mobileNavOpen}
            aria-controls="docs-mobile-nav"
          >
            <Menu size={16} />
            Chapters
          </button>
          <p className="min-w-0 truncate text-sm text-[var(--ds-gray-700)]">
            {chapter?.title || "Overview"}
          </p>
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-16 sm:px-8 sm:py-6">
          {children}
          {chapter ? <ChapterPager chapter={chapter} /> : null}
        </div>
      </div>

      <Drawer
        open={mobileNavOpen}
        side="left"
        title="Documentation"
        onClose={() => setMobileNavOpen(false)}
        className="lg:hidden"
      >
        <div id="docs-mobile-nav" className="-m-1 pb-6">
          <SidebarNav
            activeSlug={activeSlug}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </div>
      </Drawer>
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
          Documentation
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
