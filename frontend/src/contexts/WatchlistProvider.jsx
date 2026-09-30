import { WatchlistContext } from "./WatchlistContext";
import { useAuthContext } from "./AuthContext";
import { useWatchlist } from "../hooks/useWatchlist";

/**
 * Owns the Firestore watchlist subscription for the signed-in user.
 *
 * Mounted below the auth gate, so `user` is always present here and the
 * subscription is torn down on sign-out by unmounting.
 */
export const WatchlistProvider = ({ children }) => {
  const { user } = useAuthContext();
  const value = useWatchlist(user);
  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
};
