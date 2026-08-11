"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  canCrud,
  hasPermission,
  isTruthyAdmin,
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

export function useModulePermissions(module: string) {
  const { user } = useAuth();
  if (user && isTruthyAdmin(user.is_admin)) {
    return {
      access: true,
      create: true,
      read: true,
      update: true,
      delete: true,
    };
  }
  return {
    access: hasPermission(user, `${module}.access`),
    create: canCrud(user, module, "create"),
    read: canCrud(user, module, "read"),
    update: canCrud(user, module, "update"),
    delete: canCrud(user, module, "delete"),
  };
}
