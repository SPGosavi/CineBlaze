import { createContext, useContext } from "react";

export const WatchlistContext = createContext(null);

/** Reads watchlist state. Must be called beneath a WatchlistProvider. */
export const useWatchlistContext = () => {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error(
      "useWatchlistContext must be used within a WatchlistProvider"
    );
  }
  return ctx;
};
