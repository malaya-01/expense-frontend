"use client";

import Link from "next/link";
import { Star, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/feedback";
import type { CollaborativeSpace } from "@/lib/api/spaces";

export function SpaceCard({ space }: { space: CollaborativeSpace }) {
  const accent = space.color || "var(--ds-status-blue)";
  const members = space.member_count || 1;

  return (
    <Link href={`/spaces/${space.id}`} className="block ds-focus rounded-[16px]">
      <article className="relative h-full min-w-0 overflow-hidden rounded-[16px] bg-[var(--ds-background-elevated)] transition-colors hover:bg-[color-mix(in_srgb,var(--ds-gray-1000)_3%,var(--ds-background-elevated))] ds-border">
        <div
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: accent }}
          aria-hidden
        />
        <div className="p-4 pl-5 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
              <span
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px]"
                style={{
                  color: accent,
                  background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                }}
              >
                <UsersRound size={17} strokeWidth={1.85} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-[var(--ds-gray-1000)]">
                  {space.name}
                </h2>
                <p className="mt-0.5 truncate text-xs capitalize text-[var(--ds-gray-700)]">
                  {members} member{members === 1 ? "" : "s"} · {space.role || "member"}
                  {space.currency ? ` · ${space.currency}` : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {space.is_favorite ? (
                <Star
                  size={14}
                  className="text-[var(--ds-status-orange)]"
                  fill="currentColor"
                />
              ) : null}
              <Badge tone="neutral">{space.role || "member"}</Badge>
            </div>
          </div>
          {space.description ? (
            <p className="mt-4 line-clamp-2 text-xs leading-5 text-[var(--ds-gray-700)]">
              {space.description}
            </p>
          ) : (
            <p className="mt-4 text-xs leading-5 text-[var(--ds-gray-700)]">
              Shared wallet, expenses, and settlements for this group.
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
