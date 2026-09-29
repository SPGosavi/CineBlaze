import { AuthContext } from "./AuthContext";
import { useAuth } from "../hooks/useAuth";

/**
 * Supplies Firebase auth state to the whole tree.
 *
 * Kept separate from AuthContext.js because react-refresh/only-export-components
 * rejects a file that exports both a component and a hook.
 */
export const AuthProvider = ({ children }) => {
  const value = useAuth();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
