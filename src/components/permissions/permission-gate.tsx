"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  canCrud,
  hasPermission,
  type CrudAction,
} from "@/lib/permissions";

export function PermissionGate({
  code,
  children,
  fallback = null,
}: {
  code: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user } = useAuth();
  const codes = Array.isArray(code) ? code : [code];
  const allowed = codes.every((c) => hasPermission(user, c));
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

/** Hide UI unless the user may perform a CRUD action on a module. */
export function CrudGate({
  module,
  action,
  children,
  fallback = null,
}: {
  module: string;
  action: CrudAction;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user } = useAuth();
  if (!canCrud(user, module, action)) return <>{fallback}</>;
  return <>{children}</>;
}

export function useModulePermissions(_module: string) {
  const { user } = useAuth();
  const allowed = Boolean(user);
  return {
    access: allowed || hasPermission(user, `${_module}.access`),
    create: allowed,
    read: allowed,
    update: allowed,
    delete: allowed,
  };
}
