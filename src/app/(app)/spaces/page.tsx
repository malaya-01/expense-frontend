"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Star,
  UsersRound,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { ModuleHeader } from "@/components/ui/module-header";
import { SummaryKpiCard } from "@/components/ui/summary-kpi-card";
import { CardGridSkeleton } from "@/components/ui/feedback";
import { SpaceCard } from "@/components/spaces/space-card";
import { createSpace, listSpaces, type CollaborativeSpace } from "@/lib/api/spaces";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { useModulePermissions } from "@/components/permissions/permission-gate";

export default function SpacesIndexPage() {
  const perms = useModulePermissions("spaces");
  const { user } = useAuth();
  const { showToast } = useToast();
  const [spaces, setSpaces] = useState<CollaborativeSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "favorites" | "owner">("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSpaces(await listSpaces());
    } catch (err) {
      setError(getErrorMessage(err, "Could not load spaces"));
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      perms.create &&
      new URLSearchParams(window.location.search).get("create") === "1"
    ) {
      setOpen(true);
    }
  }, [perms.create]);

  const summary = useMemo(() => {
    const favorites = spaces.filter((s) => s.is_favorite).length;
    const owned = spaces.filter((s) => s.role === "owner").length;
    const members = spaces.reduce((n, s) => n + Number(s.member_count || 1), 0);
    return { favorites, owned, members, total: spaces.length };
  }, [spaces]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return spaces.filter((space) => {
      if (filter === "favorites" && !space.is_favorite) return false;
      if (filter === "owner" && space.role !== "owner") return false;
      if (!q) return true;
      return (
        space.name.toLowerCase().includes(q) ||
        (space.description || "").toLowerCase().includes(q) ||
        (space.slug || "").toLowerCase().includes(q)
      );
    });
  }, [spaces, search, filter]);

  async function onCreate(e?: FormEvent) {
    e?.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const created = await createSpace({
        name: name.trim(),
        description: description.trim() || undefined,
        currency: user?.currency || "USD",
      });
      setOpen(false);
      setName("");
      setDescription("");
      showToast({
        title: "Space created",
        description: "Invite members when you’re ready to collaborate.",
        tone: "success",
      });
      setSpaces((prev) => [created, ...prev]);
    } catch (err) {
      showToast({
        title: "Create failed",
        description: getErrorMessage(err, "Try again"),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Collaborative Spaces"
        description="Shared wallets for trips, households, and teams — with optional personal ledger linking."
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search spaces..."
        filter={filter}
        onFilterChange={(value) => setFilter(value as typeof filter)}
        filterOptions={[
          { value: "all", label: "All spaces" },
          { value: "favorites", label: "Favorites" },
          { value: "owner", label: "Owned by me" },
        ]}
        actions={
          perms.create ? (
            <Button onClick={() => setOpen(true)} className="shrink-0">
              <Plus size={16} />
              New space
            </Button>
          ) : null
        }
      />

      {error ? (
        <p className="mb-4 text-sm text-[var(--ds-status-red)]">{error}</p>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-3 xl:grid-cols-4">
        <SummaryKpiCard
          title="Spaces"
          value={String(summary.total)}
          subtitle="Workspaces you belong to"
          icon={UsersRound}
          tone="blue"
          footerLeft={{ label: "Owned", value: String(summary.owned) }}
          footerRight={{ label: "Favorited", value: String(summary.favorites) }}
        />
        <SummaryKpiCard
          title="Owned"
          value={String(summary.owned)}
          subtitle="Spaces you administer"
          icon={Wallet}
          tone="teal"
        />
        <SummaryKpiCard
          title="Favorites"
          value={String(summary.favorites)}
          subtitle="Pinned in the sidebar"
          icon={Star}
          tone="orange"
        />
        <SummaryKpiCard
          title="People"
          value={String(summary.members)}
          subtitle="Across your spaces"
          icon={UsersRound}
          tone="purple"
        />
      </div>

      {loading ? (
        <CardGridSkeleton />
      ) : spaces.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--ds-background-elevated)] ds-border">
          <EmptyState
            title="No spaces yet"
            description="Create a Home, Trip, or Startup workspace. Invite members in-app — they accept from notifications."
            actionLabel={perms.create ? "Create space" : undefined}
            onAction={perms.create ? () => setOpen(true) : undefined}
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--ds-background-elevated)] px-5 py-10 text-center ds-border">
          <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
            No spaces match your filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
          {visible.map((space) => (
            <SpaceCard key={space.id} space={space} />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create collaborative space"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void onCreate()}>
              Create space
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={onCreate}>
          <div>
            <Label htmlFor="space-name">Name</Label>
            <Input
              id="space-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Delhi Trip"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="space-desc">Description</Label>
            <Input
              id="space-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional context for members"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
