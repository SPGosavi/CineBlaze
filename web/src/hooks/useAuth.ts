"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { firebaseInitialized, requireAuth } from "@/lib/firebase";

export interface AuthState {
  user: User | null;
  /** True until Firebase has reported the initial auth state. */
  loading: boolean;
  /** True while a sign-in attempt is in flight. */
  submitting: boolean;
  loginError: string;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const message = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/operation-not-allowed":
        return "Email and password sign-in is not enabled.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Invalid email or password.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      default:
        return error.message;
    }
  }
  return error instanceof Error ? error.message : "Authentication failed.";
};

/**
 * Owns Firebase auth state and the sign-in / sign-up / sign-out actions.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseInitialized);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (!firebaseInitialized) return;
    const unsubscribe = onAuthStateChanged(requireAuth(), (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setSubmitting(true);
    setLoginError("");
    try {
      await signInWithEmailAndPassword(requireAuth(), email, password);
    } catch (error) {
      setLoginError(message(error));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    setSubmitting(true);
    setLoginError("");
    try {
      await createUserWithEmailAndPassword(requireAuth(), email, password);
    } catch (error) {
      setLoginError(message(error));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const continueAsGuest = useCallback(async () => {
    setSubmitting(true);
    setLoginError("");
    try {
      await signInAnonymously(requireAuth());
    } catch (error) {
      setLoginError(message(error));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(requireAuth());
    } catch (error) {
      console.error(error);
    }
  }, []);

  return useMemo(
    () => ({
      user,
      loading,
      submitting,
      loginError,
      login,
      signup,
      continueAsGuest,
      logout,
    }),
    [
      user,
      loading,
      submitting,
      loginError,
      login,
      signup,
      continueAsGuest,
      logout,
    ]
  );
}
