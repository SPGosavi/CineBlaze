import { Outlet } from "react-router-dom";
import { SearchProvider } from "./SearchProvider";
import { WatchlistProvider } from "./WatchlistProvider";
import { ModalProvider } from "./ModalProvider";

/**
 * Feature providers for the authenticated area, mounted as a layout route.
 *
 * Sits below ProtectedRoute so `user` is guaranteed present, which means
 * WatchlistProvider's Firestore subscription is created on sign-in and
 * disposed by unmounting on sign-out.
 */
const AppProviders = () => (
  <SearchProvider>
    <WatchlistProvider>
      <ModalProvider>
        <Outlet />
      </ModalProvider>
    </WatchlistProvider>
  </SearchProvider>
);

export default AppProviders;
