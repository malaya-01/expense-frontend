"use client";

import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { GuideShell } from "@/components/guide/guide-shell";
import { APP_NAME } from "@/lib/brand";
import { documentationPath } from "@/lib/docs/portal";
import { GUIDE_CHAPTERS, GUIDE_GROUPS } from "@/lib/guide/chapters";

export function GuideOverview() {
  return (
    <GuideShell>
      <header className="rounded-[16px] border border-[var(--ds-gray-200)] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--ds-focus-color)_10%,transparent),transparent_55%),var(--ds-background-elevated)] px-5 py-6 sm:px-8 sm:py-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] px-3 py-1 text-[11px] font-medium text-[var(--ds-gray-900)]">
          <BookOpen size={13} />
          Product documentation
        </div>
        <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.04em] text-[var(--ds-gray-1000)] sm:text-[34px]">
          Learn {APP_NAME} end to end
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ds-gray-900)] sm:text-[15px]">
          Separate chapters for every major screen — what it does, how to open
          it, how it works, and how to move around. Use Previous / Next on each
          page, or jump from the sidebar.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={documentationPath("getting-started")}
            className="ds-btn-solid inline-flex items-center gap-1.5 rounded-[9px] bg-[var(--ds-gray-1000)] px-3.5 py-2 text-sm font-medium hover:bg-[var(--ds-primary-hover)]"
          >
            Start here
            <ArrowRight size={14} />
          </Link>
          <Link
            href={documentationPath("offline-sync")}
            className="inline-flex items-center rounded-[9px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-100)] px-3.5 py-2 text-sm font-medium text-[var(--ds-gray-1000)]"
          >
            Offline & sync
          </Link>
        </div>
      </header>

      <div className="mt-8 space-y-8">
        {GUIDE_GROUPS.map((group) => {
          const chapters = GUIDE_CHAPTERS.filter((c) => c.group === group.id);
          if (!chapters.length) return null;
          return (
            <section key={group.id}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-gray-700)]">
                {group.label}
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {chapters.map((chapter) => {
                  const Icon = chapter.icon;
                  return (
                    <Link
                      key={chapter.slug}
                      href={documentationPath(chapter.slug)}
                      className="group rounded-[14px] border border-[var(--ds-gray-200)] bg-[var(--ds-background-elevated)] p-4 transition-colors hover:border-[var(--ds-gray-400)]"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--ds-background-100)] text-[var(--ds-gray-1000)]">
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[var(--ds-gray-1000)]">
                              {chapter.title}
                            </p>
                            <ArrowRight
                              size={14}
                              className="shrink-0 text-[var(--ds-gray-700)] opacity-0 transition-opacity group-hover:opacity-100"
                            />
                          </div>
                          <p className="mt-1 text-sm leading-6 text-[var(--ds-gray-900)]">
                            {chapter.summary}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </GuideShell>
  );
}
