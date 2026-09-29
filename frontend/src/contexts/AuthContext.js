import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

/** Reads auth state. Must be called beneath an AuthProvider. */
export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return ctx;
};
