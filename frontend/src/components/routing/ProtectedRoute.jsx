import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "../../contexts/AuthContext";
import FullPageSpinner from "../ui/FullPageSpinner";

/**
 * Gates the authenticated area.
 *
 * Waits for Firebase to report initial auth state before deciding, so a
 * signed-in user is never bounced to /login on a page refresh.
 */
const ProtectedRoute = () => {
  const { user, loading } = useAuthContext();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
};

export default ProtectedRoute;
