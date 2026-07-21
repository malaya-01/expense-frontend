import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types";

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
      state.user = action.payload.user;
      state.hasAccessToken = action.payload.hasAccessToken;
      state.ready = true;
    },
    setSession(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.hasAccessToken = true;
    },
    logout(state) {
      state.user = null;
      state.hasAccessToken = false;
    },
  },
});

export const { hydrateAuth, setSession, logout } = authSlice.actions;
export default authSlice.reducer;

export function selectIsAuthenticated(state: { auth: AuthState }) {
  return Boolean(state.auth.user && state.auth.hasAccessToken);
}
