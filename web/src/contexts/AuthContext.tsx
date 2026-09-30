"use client";

import { createContext, useContext } from "react";
import { useAuth, type AuthState } from "@/hooks/useAuth";

const AuthContext = createContext<AuthState | null>(null);

/**
 * Supplies Firebase auth state to the whole tree.
 *
 * Mounted at the root layout rather than behind a gate, because unlike Phase 2
 * most of this app is public — the nav needs to know whether to show "Sign in"
 * or the account block on every page.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAuth();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Reads auth state. Must be called beneath an AuthProvider. */
export function useAuthContext(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
