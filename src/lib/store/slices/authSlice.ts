import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types";
import { isTruthyAdmin } from "@/lib/permissions";

export const USER_STORAGE_KEY = "expense-tracker:user";

export type AuthState = {
  user: User | null;
  ready: boolean;
  hasAccessToken: boolean;
};

const initialState: AuthState = {
  user: null,
  ready: false,
  hasAccessToken: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateAuth(
      state,
      action: PayloadAction<{ user: User | null; hasAccessToken: boolean }>,
    ) {
      const next = action.payload.user;
      state.user = next
        ? {
            ...next,
            is_admin: isTruthyAdmin(
              next.is_admin ?? (next as { isAdmin?: unknown }).isAdmin,
            ),
          }
        : null;
      state.hasAccessToken = action.payload.hasAccessToken;
      state.ready = true;
    },
    setSession(state, action: PayloadAction<User>) {
      state.user = {
        ...action.payload,
        is_admin: isTruthyAdmin(
          action.payload.is_admin ??
            (action.payload as { isAdmin?: unknown }).isAdmin,
        ),
      };
      state.hasAccessToken = true;
    },
    updatePermissions(
      state,
      action: PayloadAction<{ is_admin: boolean; permissions: string[] }>,
    ) {
      if (!state.user) return;
      const incomingAdmin = isTruthyAdmin(action.payload.is_admin);
      const nextPermissions = Array.isArray(action.payload.permissions)
        ? action.payload.permissions
        : state.user.permissions;
      state.user = {
        ...state.user,
        // Never strip super-admin in-session if a stale /permissions/me says false.
        is_admin: incomingAdmin || isTruthyAdmin(state.user.is_admin),
        permissions: nextPermissions,
      };
    },
    logout(state) {
      state.user = null;
      state.hasAccessToken = false;
    },
  },
});

export const { hydrateAuth, setSession, updatePermissions, logout } =
  authSlice.actions;
export default authSlice.reducer;

export function selectIsAuthenticated(state: { auth: AuthState }) {
  return Boolean(state.auth.user && state.auth.hasAccessToken);
}
