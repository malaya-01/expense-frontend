import { api, unwrap } from "./client";
import { isTruthyAdmin } from "@/lib/permissions";

export type PermissionCatalogItem = {
  id: string;
  module: string;
  code: string;
  name: string;
  description: string | null;
  is_default: boolean;
};

export type UserPermissionRow = PermissionCatalogItem & {
  override_effect: "GRANT" | "REVOKE" | null;
  effective: boolean;
};

export type AdminUserSummary = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at?: string;
  last_login_at?: string | null;
};

export type UserPermissionsDetail = {
  user: AdminUserSummary;
  permissions: UserPermissionRow[];
  effective: string[];
  is_admin: boolean;
};

export type MyPermissions = {
  is_admin: boolean;
  permissions: string[];
};

export async function fetchMyPermissions(): Promise<MyPermissions> {
  const res = await api.get("/permissions/me");
  const raw = unwrap<MyPermissions & { data?: MyPermissions }>(res) as
    | MyPermissions
    | { data?: MyPermissions }
    | undefined;
  const payload =
    raw && typeof raw === "object" && Array.isArray((raw as MyPermissions).permissions)
      ? (raw as MyPermissions)
      : raw && typeof raw === "object"
        ? (raw as { data?: MyPermissions }).data
        : undefined;
  return {
    is_admin: isTruthyAdmin(payload?.is_admin),
    permissions: Array.isArray(payload?.permissions) ? payload.permissions : [],
  };
}

export async function fetchPermissionCatalog(): Promise<PermissionCatalogItem[]> {
  const res = await api.get("/permissions");
  return unwrap<PermissionCatalogItem[]>(res);
}

export async function fetchAdminUsers(params?: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  users: AdminUserSummary[];
  total: number;
  limit: number;
  offset: number;
}> {
  const res = await api.get("/permissions/users", { params });
  return unwrap(res);
}

export async function fetchUserPermissions(
  userId: string,
): Promise<UserPermissionsDetail> {
  const res = await api.get(`/permissions/users/${userId}`);
  return unwrap<UserPermissionsDetail>(res);
}

export async function updateUserPermissions(
  userId: string,
  overrides: { code: string; effect: "GRANT" | "REVOKE" | null }[],
): Promise<UserPermissionsDetail> {
  const res = await api.put(`/permissions/users/${userId}`, { overrides });
  return unwrap<UserPermissionsDetail>(res);
}

export async function setUserAdminFlag(
  userId: string,
  is_admin: boolean,
): Promise<UserPermissionsDetail> {
  const res = await api.patch(`/permissions/users/${userId}/admin`, {
    is_admin,
  });
  return unwrap<UserPermissionsDetail>(res);
}
