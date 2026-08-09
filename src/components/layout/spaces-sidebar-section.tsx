"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Star,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { listSpaces, type CollaborativeSpace } from "@/lib/api/spaces";
import { useAuth } from "@/lib/auth-context";
import { canCrud } from "@/lib/permissions";

export function SpacesSidebarSection({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  const canCreateSpace = canCrud(user, "spaces", "create");
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(() => pathname.startsWith("/spaces"));
  const [spaces, setSpaces] = useState<CollaborativeSpace[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    listSpaces()
      .then(setSpaces)
      .catch(() => setSpaces([]));
  }, [user?.id]);

  useEffect(() => {
    if (pathname.startsWith("/spaces")) setExpanded(true);
  }, [pathname]);

  const favorites = spaces.filter((s) => s.is_favorite);
  const rest = spaces.filter((s) => !s.is_favorite);
  const shown = [...favorites, ...rest].slice(0, 8);

  return (
    <div className="mt-5 space-y-0.5">
      <div className="mb-1 flex items-center gap-0.5 px-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-h-7 flex-1 items-center gap-1 rounded-[6px] px-1 text-[10px] font-medium text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] ds-focus"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="flex-1 text-left">Collaborative Spaces</span>
        </button>
        {canCreateSpace ? (
        <button
          type="button"
          title="New space"
          aria-label="New space"
          className="flex size-6 items-center justify-center rounded-[6px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
          onClick={() => {
            onNavigate?.();
            router.push("/spaces?create=1");
          }}
        >
          <Plus size={12} />
        </button>
        ) : null}
      </div>

      {expanded ? (
        <>
          <Link
            href="/spaces"
            onClick={onNavigate}
            className={cn(
              "group flex min-h-8 items-center gap-2.5 rounded-[7px] px-2 text-[12px] ds-focus",
              "text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)]",
              pathname === "/spaces" &&
                "bg-[var(--ds-gray-100)] font-medium text-[var(--ds-gray-1000)]",
            )}
          >
            <UsersRound
              size={15}
              strokeWidth={1.8}
              className={cn(
                "text-[var(--ds-gray-700)]",
                pathname === "/spaces" && "text-[var(--ds-focus-color)]",
              )}
            />
            All spaces
          </Link>
          {shown.map((space) => {
            const href = `/spaces/${space.id}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={space.id}
                href={href}
                onClick={onNavigate}
                title={space.name}
                className={cn(
                  "group flex min-h-8 items-center gap-2 rounded-[7px] px-2 text-[12px] ds-focus",
                  "text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)]",
                  active &&
                    "bg-[var(--ds-gray-100)] font-medium text-[var(--ds-gray-1000)]",
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    background: space.color || "var(--ds-status-blue)",
                  }}
                />
                <span className="min-w-0 flex-1 truncate">{space.name}</span>
                {space.is_favorite ? (
                  <Star
                    size={11}
                    className="shrink-0 text-[var(--ds-status-orange)]"
                    fill="currentColor"
                  />
                ) : null}
              </Link>
            );
          })}
          {!shown.length ? (
            <p className="px-2 py-1 text-[11px] text-[var(--ds-gray-700)]">
              No spaces yet
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
