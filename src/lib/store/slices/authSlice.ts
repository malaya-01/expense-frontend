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
      const incoming = action.payload;
      const previous =
        state.user && incoming?.id && state.user.id === incoming.id
          ? state.user
          : null;
      const incomingAdminRaw =
        incoming.is_admin ?? (incoming as { isAdmin?: unknown }).isAdmin;
      if (previous) {
        // Same account (e.g. profile edit): merge so a partial payload
        // without permissions / is_admin does not strip them.
        const merged = { ...previous };
        for (const [key, value] of Object.entries(incoming)) {
          if (value !== undefined) {
            (merged as Record<string, unknown>)[key] = value;
          }
        }
        merged.is_admin =
          incomingAdminRaw === undefined || incomingAdminRaw === null
            ? isTruthyAdmin(previous.is_admin)
            : isTruthyAdmin(incomingAdminRaw);
        merged.permissions = Array.isArray(incoming.permissions)
          ? incoming.permissions
          : previous.permissions;
        state.user = merged;
      } else {
        state.user = {
          ...incoming,
          is_admin: isTruthyAdmin(incomingAdminRaw),
        };
      }
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
    /** Explicit user sign-out (local data is wiped by useAuth().logout). */
    logout(state) {
      state.user = null;
      state.hasAccessToken = false;
    },
    /**
     * Refresh token rejected. Drop credentials only — keep the offline
     * outbox / durable backup so unsynced work survives re-login.
     */
    sessionExpired(state) {
      state.user = null;
      state.hasAccessToken = false;
    },
  },
});

export const {
  hydrateAuth,
  setSession,
  updatePermissions,
  logout,
  sessionExpired,
} = authSlice.actions;
export default authSlice.reducer;

export function selectIsAuthenticated(state: { auth: AuthState }) {
  return Boolean(state.auth.user && state.auth.hasAccessToken);
}
