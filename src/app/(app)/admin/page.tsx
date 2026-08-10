"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import {
  fetchAdminUsers,
  fetchUserPermissions,
  setUserAdminFlag,
  updateUserPermissions,
  type AdminUserSummary,
  type UserPermissionRow,
  type UserPermissionsDetail,
} from "@/lib/api/permissions";
import { hasPermission } from "@/lib/permissions";

type DraftEffect = "GRANT" | "REVOKE" | "DEFAULT";

const ACTION_ORDER = [
  "access",
  "create",
  "read",
  "update",
  "delete",
  "manage_users",
  "manage_permissions",
] as const;

function actionFromCode(code: string): string {
  const parts = code.split(".");
  return parts.length > 1 ? parts.slice(1).join(".") : code;
}

function sortPermissionRows(rows: UserPermissionRow[]): UserPermissionRow[] {
  return [...rows].sort((a, b) => {
    const aa = actionFromCode(a.code);
    const ba = actionFromCode(b.code);
    const ai = ACTION_ORDER.indexOf(aa as (typeof ACTION_ORDER)[number]);
    const bi = ACTION_ORDER.indexOf(ba as (typeof ACTION_ORDER)[number]);
    const av = ai === -1 ? 99 : ai;
    const bv = bi === -1 ? 99 : bi;
    if (av !== bv) return av - bv;
    return a.code.localeCompare(b.code);
  });
}

function modeFromRow(row: UserPermissionRow): DraftEffect {
  if (row.override_effect === "GRANT") return "GRANT";
  if (row.override_effect === "REVOKE") return "REVOKE";
  return "DEFAULT";
}

export default function AdminPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManageUsers =
    Boolean(user?.is_admin) ||
    hasPermission(user, "admin.manage_users") ||
    hasPermission(user, "admin.manage_permissions");
  const canManagePermissions =
    Boolean(user?.is_admin) ||
    hasPermission(user, "admin.manage_permissions");

  const [q, setQ] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserPermissionsDetail | null>(null);
  const [draft, setDraft] = useState<Record<string, DraftEffect>>({});
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadUsers = useCallback(
    async (query?: string) => {
      setLoadingUsers(true);
      try {
        const data = await fetchAdminUsers({
          q: query || undefined,
          limit: 100,
        });
        setUsers(data.users);
      } catch (err) {
        showToast({
          title: "Failed to load users",
          description: getErrorMessage(err, "Could not load users"),
          tone: "error",
        });
      } finally {
        setLoadingUsers(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (!canManageUsers) return;
    void loadUsers();
  }, [canManageUsers, loadUsers]);

  const loadDetail = useCallback(
    async (userId: string) => {
      setLoadingDetail(true);
      setSelectedId(userId);
      try {
        const data = await fetchUserPermissions(userId);
        setDetail(data);
        const next: Record<string, DraftEffect> = {};
        for (const row of data.permissions) {
          next[row.code] = modeFromRow(row);
        }
        setDraft(next);
      } catch (err) {
        showToast({
          title: "Failed to load permissions",
          description: getErrorMessage(err, "Could not load user permissions"),
          tone: "error",
        });
      } finally {
        setLoadingDetail(false);
      }
    },
    [showToast],
  );

  const grouped = useMemo(() => {
    if (!detail) return [] as { module: string; rows: UserPermissionRow[] }[];
    const map = new Map<string, UserPermissionRow[]>();
    for (const row of detail.permissions) {
      const list = map.get(row.module) || [];
      list.push(row);
      map.set(row.module, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([module, rows]) => ({
        module,
        rows: sortPermissionRows(rows),
      }));
  }, [detail]);

  function setModulePreset(
    module: string,
    mode: DraftEffect,
    onlyActions?: string[],
  ) {
    if (!detail) return;
    setDraft((prev) => {
      const next = { ...prev };
      for (const row of detail.permissions) {
        if (row.module !== module) continue;
        const action = actionFromCode(row.code);
        if (onlyActions && !onlyActions.includes(action)) continue;
        next[row.code] = mode;
      }
      return next;
    });
  }

  const dirtyOverrides = useMemo(() => {
    if (!detail) return [];
    const changes: { code: string; effect: "GRANT" | "REVOKE" | null }[] = [];
    for (const row of detail.permissions) {
      const current = modeFromRow(row);
      const next = draft[row.code] ?? current;
      if (next === current) continue;
      changes.push({
        code: row.code,
        effect: next === "DEFAULT" ? null : next,
      });
    }
    return changes;
  }, [detail, draft]);

  async function onSave() {
    if (!selectedId || !dirtyOverrides.length) return;
    setSaving(true);
    try {
      const data = await updateUserPermissions(selectedId, dirtyOverrides);
      setDetail(data);
      const next: Record<string, DraftEffect> = {};
      for (const row of data.permissions) {
        next[row.code] = modeFromRow(row);
      }
      setDraft(next);
      showToast({
        title: "Permissions updated",
        description: `Saved ${dirtyOverrides.length} override(s).`,
        tone: "success",
      });
      void loadUsers(q);
    } catch (err) {
      showToast({
        title: "Save failed",
        description: getErrorMessage(err, "Could not update permissions"),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onToggleAdmin(next: boolean) {
    if (!selectedId || !user?.is_admin) return;
    if (selectedId === user.id && !next) {
      showToast({
        title: "Not allowed",
        description: "You cannot remove your own super-admin flag.",
        tone: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      const data = await setUserAdminFlag(selectedId, next);
      setDetail(data);
      void loadUsers(q);
      showToast({
        title: next ? "Super-admin granted" : "Super-admin removed",
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Update failed",
        description: getErrorMessage(err, "Could not update admin flag"),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!canManageUsers && !canManagePermissions) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Admin"
          description="You do not have permission to manage users."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-20 lg:pb-0">
      <PageHeader
        title="Admin"
        description="Manage platform users and module permissions."
      />

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:items-start">
        {/* Users pane */}
        <Card className="overflow-hidden">
          <CardHeader className="space-y-2">
            <Label htmlFor="admin-user-search">Users</Label>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void loadUsers(q);
              }}
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ds-gray-700)]"
                />
                <Input
                  id="admin-user-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search email or name"
                  className="pl-8"
                />
              </div>
              <Button type="submit" size="sm" variant="secondary">
                Search
              </Button>
            </form>
          </CardHeader>
          <CardBody className="max-h-[40vh] space-y-1 overflow-y-auto pt-0 sm:max-h-[50vh] lg:max-h-[70vh]">
            {loadingUsers ? (
              <p className="text-xs text-[var(--ds-gray-700)]">Loading…</p>
            ) : users.length === 0 ? (
              <p className="text-xs text-[var(--ds-gray-700)]">No users found.</p>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => void loadDetail(u.id)}
                  className={cn(
                    "flex w-full flex-col rounded-[8px] px-2.5 py-2 text-left transition-colors",
                    selectedId === u.id
                      ? "bg-[var(--ds-gray-100)]"
                      : "hover:bg-[var(--ds-gray-100)]",
                  )}
                >
                  <span className="truncate text-[12px] font-medium text-[var(--ds-gray-1000)]">
                    {u.full_name || u.email}
                  </span>
                  <span className="truncate text-[11px] text-[var(--ds-gray-700)]">
                    {u.email}
                    {u.is_admin ? " · super-admin" : ""}
                  </span>
                </button>
              ))
            )}
          </CardBody>
        </Card>

        {/* Detail pane */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-[14px] font-medium text-[var(--ds-gray-1000)]">
                {detail?.user.full_name ||
                  detail?.user.email ||
                  "Select a user"}
              </h2>
              {detail ? (
                <p className="mt-0.5 break-all text-[12px] text-[var(--ds-gray-700)]">
                  {detail.user.email}
                  {detail.is_admin
                    ? " · super-admin (bypasses all checks)"
                    : ""}
                </p>
              ) : (
                <p className="mt-0.5 text-[12px] text-[var(--ds-gray-700)]">
                  Choose a user to view and edit their access matrix.
                </p>
              )}
            </div>
            {detail && canManagePermissions ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                {user?.is_admin ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    disabled={saving || selectedId === user.id}
                    onClick={() => void onToggleAdmin(!detail.is_admin)}
                  >
                    {detail.is_admin
                      ? "Remove super-admin"
                      : "Make super-admin"}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  className="hidden w-full sm:inline-flex sm:w-auto"
                  loading={saving}
                  disabled={!dirtyOverrides.length || saving}
                  onClick={() => void onSave()}
                >
                  Save overrides
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardBody className="min-w-0">
            {!selectedId ? (
              <p className="text-sm text-[var(--ds-gray-700)]">
                No user selected.
              </p>
            ) : loadingDetail ? (
              <p className="text-sm text-[var(--ds-gray-700)]">
                Loading matrix…
              </p>
            ) : (
              <div className="space-y-4 sm:space-y-5">
                {grouped.map((group) => (
                  <div key={group.module} className="min-w-0">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ds-gray-700)]">
                        {group.module}
                      </p>
                      {canManagePermissions && !detail?.is_admin ? (
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="rounded-[5px] px-1.5 py-0.5 text-[10px] text-[var(--ds-gray-800)] hover:bg-[var(--ds-gray-100)]"
                            onClick={() =>
                              setModulePreset(group.module, "DEFAULT")
                            }
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            className="rounded-[5px] px-1.5 py-0.5 text-[10px] text-[var(--ds-gray-800)] hover:bg-[var(--ds-gray-100)]"
                            onClick={() =>
                              setModulePreset(group.module, "GRANT", [
                                "access",
                                "create",
                                "read",
                                "update",
                                "delete",
                              ])
                            }
                          >
                            Grant CRUD
                          </button>
                          <button
                            type="button"
                            className="rounded-[5px] px-1.5 py-0.5 text-[10px] text-[var(--ds-gray-800)] hover:bg-[var(--ds-gray-100)]"
                            onClick={() =>
                              setModulePreset(group.module, "REVOKE", [
                                "create",
                                "update",
                                "delete",
                              ])
                            }
                          >
                            Read-only
                          </button>
                          <button
                            type="button"
                            className="rounded-[5px] px-1.5 py-0.5 text-[10px] text-[var(--ds-status-red)] hover:bg-[var(--ds-gray-100)]"
                            onClick={() =>
                              setModulePreset(group.module, "REVOKE")
                            }
                          >
                            Revoke all
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {/* Mobile: stacked permission cards */}
                    <div className="space-y-2 md:hidden">
                      {group.rows.map((row) => {
                        const mode = draft[row.code] ?? modeFromRow(row);
                        const effective =
                          detail?.is_admin ||
                          mode === "GRANT" ||
                          (mode === "DEFAULT" && row.is_default);
                        const action = actionFromCode(row.code);
                        return (
                          <div
                            key={row.code}
                            className="rounded-[10px] bg-[var(--ds-background-elevated)] p-3 ds-border"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-[12px] font-medium text-[var(--ds-gray-1000)]">
                                  {row.name}
                                </p>
                                <p className="mt-0.5 break-all text-[10px] text-[var(--ds-gray-700)]">
                                  {row.code}
                                  {row.is_default
                                    ? " · default on"
                                    : " · default off"}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                  effective
                                    ? "bg-[color-mix(in_srgb,var(--ds-success)_18%,transparent)] text-[var(--ds-gray-1000)]"
                                    : "bg-[var(--ds-gray-100)] text-[var(--ds-gray-700)]",
                                )}
                              >
                                {effective ? "On" : "Off"}
                              </span>
                            </div>
                            <div className="mt-2.5 flex items-center gap-2">
                              <span className="inline-flex rounded-[5px] bg-[var(--ds-gray-100)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--ds-gray-800)]">
                                {action}
                              </span>
                              <select
                                className="h-8 min-w-0 flex-1 rounded-[7px] bg-[var(--ds-background-elevated)] px-2 text-[12px] ds-border ds-focus disabled:opacity-50"
                                value={mode}
                                disabled={
                                  !canManagePermissions ||
                                  Boolean(
                                    detail?.is_admin && !user?.is_admin,
                                  )
                                }
                                onChange={(e) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    [row.code]: e.target.value as DraftEffect,
                                  }))
                                }
                              >
                                <option value="DEFAULT">Default</option>
                                <option value="GRANT">Granted</option>
                                <option value="REVOKE">Revoked</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop / tablet: table */}
                    <div className="hidden overflow-x-auto rounded-[10px] ds-border md:block">
                      <table className="w-full min-w-[520px] text-left text-[12px]">
                        <thead className="bg-[var(--ds-gray-100)] text-[var(--ds-gray-700)]">
                          <tr>
                            <th className="px-3 py-2 font-medium">
                              Permission
                            </th>
                            <th className="px-3 py-2 font-medium">Action</th>
                            <th className="px-3 py-2 font-medium">
                              Effective
                            </th>
                            <th className="px-3 py-2 font-medium">Mode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((row) => {
                            const mode = draft[row.code] ?? modeFromRow(row);
                            const effective =
                              detail?.is_admin ||
                              mode === "GRANT" ||
                              (mode === "DEFAULT" && row.is_default);
                            const action = actionFromCode(row.code);
                            return (
                              <tr
                                key={row.code}
                                className="border-t border-[var(--ds-gray-200)]"
                              >
                                <td className="px-3 py-2">
                                  <div className="font-medium text-[var(--ds-gray-1000)]">
                                    {row.name}
                                  </div>
                                  <div className="text-[11px] text-[var(--ds-gray-700)]">
                                    {row.code}
                                    {row.is_default
                                      ? " · default on"
                                      : " · default off"}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex rounded-[5px] bg-[var(--ds-gray-100)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--ds-gray-800)]">
                                    {action}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                                      effective
                                        ? "bg-[color-mix(in_srgb,var(--ds-success)_18%,transparent)] text-[var(--ds-gray-1000)]"
                                        : "bg-[var(--ds-gray-100)] text-[var(--ds-gray-700)]",
                                    )}
                                  >
                                    {effective ? "On" : "Off"}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    className="h-8 rounded-[7px] bg-[var(--ds-background-elevated)] px-2 ds-border ds-focus disabled:opacity-50"
                                    value={mode}
                                    disabled={
                                      !canManagePermissions ||
                                      Boolean(
                                        detail?.is_admin && !user?.is_admin,
                                      )
                                    }
                                    onChange={(e) =>
                                      setDraft((prev) => ({
                                        ...prev,
                                        [row.code]: e.target
                                          .value as DraftEffect,
                                      }))
                                    }
                                  >
                                    <option value="DEFAULT">Default</option>
                                    <option value="GRANT">Granted</option>
                                    <option value="REVOKE">Revoked</option>
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Mobile sticky save bar */}
      {detail && canManagePermissions && dirtyOverrides.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_12%,transparent)] bg-[var(--ds-background-elevated)] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <Button
            className="w-full"
            loading={saving}
            disabled={saving}
            onClick={() => void onSave()}
          >
            Save {dirtyOverrides.length} override
            {dirtyOverrides.length === 1 ? "" : "s"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
