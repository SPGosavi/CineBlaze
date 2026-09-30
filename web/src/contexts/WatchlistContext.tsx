"use client";

import { createContext, useContext } from "react";
import { useWatchlist, type WatchlistState } from "@/hooks/useWatchlist";
import { useAuthContext } from "./AuthContext";

const WatchlistContext = createContext<WatchlistState | null>(null);

/**
 * Owns the Firestore watchlist subscription for the signed-in user.
 *
 * Unlike Phase 2 this sits above the auth gate, because the watchlist button
 * appears on public pages too. `useWatchlist` handles a null user by holding
 * an empty list and opening no subscription.
 */
export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const value = useWatchlist(user);
  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

/** Reads watchlist state. Must be called beneath a WatchlistProvider. */
export function useWatchlistContext(): WatchlistState {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error(
      "useWatchlistContext must be used within a WatchlistProvider"
    );
  }
  return context;
}
