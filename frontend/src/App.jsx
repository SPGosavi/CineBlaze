import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import AppProviders from './contexts/AppProviders';
import ProtectedRoute from './components/routing/ProtectedRoute';
import GlobalStyles from './components/layout/GlobalStyles';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import DiscoverPage from './pages/DiscoverPage';
import WatchlistPage from './pages/WatchlistPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <GlobalStyles />
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
      </BrowserRouter>
    </AuthProvider>
  );
}
