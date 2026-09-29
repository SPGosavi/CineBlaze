import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthProvider";
import AppProviders from "./contexts/AppProviders";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import GlobalStyles from "./components/layout/GlobalStyles";
import MainLayout from "./components/layout/MainLayout";
import FullPageSpinner from "./components/ui/FullPageSpinner";

// Split per route so the initial load only pulls in the page being shown.
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const WatchlistPage = lazy(() => import("./pages/WatchlistPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <GlobalStyles />
        <Suspense fallback={<FullPageSpinner />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppProviders />}>
                <Route element={<MainLayout />}>
                  <Route index element={<DiscoverPage />} />
                  <Route path="watchlist" element={<WatchlistPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
