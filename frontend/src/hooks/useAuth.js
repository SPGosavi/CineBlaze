import { useState, useEffect, useCallback, useMemo } from "react";
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, firebaseInitialized } from "../services/firebase";

/**
 * Owns Firebase auth state and the sign-in / sign-out actions.
 *
 * When Firebase is not configured, loading resolves immediately and the
 * user stays null, which the UI treats as signed out.
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (!firebaseInitialized) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = useCallback(async (email, password, isDemo) => {
    setLoading(true);
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      // The demo account is created on first use rather than seeded.
      if (
        isDemo &&
        (e.code === "auth/user-not-found" ||
          e.code === "auth/invalid-credential")
      ) {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (createErr) {
          setLoginError(createErr.message);
        }
      } else {
        setLoginError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGuest = useCallback(async () => {
    setLoading(true);
    setLoginError("");
    try {
      await signInAnonymously(auth);
    } catch (e) {
      setLoginError(e.message);
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return useMemo(
    () => ({
      user,
      loading,
      loginError,
      handleLogin,
      handleGuest,
      handleLogout,
    }),
    [user, loading, loginError, handleLogin, handleGuest, handleLogout]
  );
};
