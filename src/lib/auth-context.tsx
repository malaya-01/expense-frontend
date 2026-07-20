"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearTokens, getAccessToken } from "@/lib/api/client";
import type { User } from "@/types";

type AuthState = {
  user: User | null;
  ready: boolean;
  isAuthenticated: boolean;
  setSession: (user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const USER_KEY = "expense-tracker:user";

function readUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const stored = readUser();
    if (token && stored) {
      setUser(stored);
    } else if (!token) {
      localStorage.removeItem(USER_KEY);
    }
    setReady(true);
  }, []);

  const setSession = useCallback((next: User) => {
    setUser(next);
    localStorage.setItem(USER_KEY, JSON.stringify(next));
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: Boolean(user && getAccessToken()),
      setSession,
      logout,
    }),
    [user, ready, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
