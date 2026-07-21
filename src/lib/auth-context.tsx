"use client";

import { useCallback } from "react";
import type { User } from "@/types";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  logout as logoutAction,
  selectIsAuthenticated,
  setSession as setSessionAction,
} from "@/lib/store/slices/authSlice";

export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const ready = useAppSelector((state) => state.auth.ready);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const setSession = useCallback(
    (next: User) => {
      dispatch(setSessionAction(next));
    },
    [dispatch],
  );

  const logout = useCallback(() => {
    dispatch(logoutAction());
  }, [dispatch]);

  return {
    user,
    ready,
    isAuthenticated,
    setSession,
    logout,
  };
}
