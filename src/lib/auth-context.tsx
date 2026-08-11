"use client";

import { useCallback } from "react";
import type { User } from "@/types";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  logout as logoutAction,
  selectIsAuthenticated,
  setSession as setSessionAction,
  updatePermissions as updatePermissionsAction,
} from "@/lib/store/slices/authSlice";
import { canAccessAdmin, canCrud, hasPermission } from "@/lib/permissions";
import {
  clearAccountLocalData,
  switchOfflineUser,
} from "@/lib/offline/clear-session";

export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const ready = useAppSelector((state) => state.auth.ready);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const setSession = useCallback(
    async (next: User) => {
      await switchOfflineUser(next.id);
      dispatch(setSessionAction(next));
    },
    [dispatch],
  );

  const setPermissions = useCallback(
    (payload: { is_admin: boolean; permissions: string[] }) => {
      dispatch(updatePermissionsAction(payload));
    },
    [dispatch],
  );

  const logout = useCallback(async () => {
    await clearAccountLocalData(user?.id);
    dispatch(logoutAction());
  }, [dispatch, user?.id]);

  const can = useCallback((code: string) => hasPermission(user, code), [user]);

  const canModuleCrud = useCallback(
    (module: string, action: "create" | "read" | "update" | "delete") =>
      canCrud(user, module, action),
    [user],
  );

  return {
    user,
    ready,
    isAuthenticated,
    setSession,
    setPermissions,
    logout,
    can,
    canCrud: canModuleCrud,
    canAccessAdmin: canAccessAdmin(user),
  };
}
