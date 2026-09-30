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
  login: (email: string, password: string, isDemo: boolean) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const message = (error: unknown): string =>
  error instanceof FirebaseError || error instanceof Error
    ? error.message
    : "Authentication failed.";

/**
 * Owns Firebase auth state and the sign-in / sign-out actions.
 *
 * `loading` and `submitting` are separate, unlike Phase 2 where a single flag
 * did both jobs. Conflating them meant a failed sign-in briefly re-rendered
 * the whole route as a full-page spinner before showing the error.
 *
 * When Firebase is not configured, loading resolves immediately and the user
 * stays null, which the UI treats as signed out.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  // Seeded from the module-level flag rather than set to false inside the
  // effect. With no Firebase configured there is nothing to wait for, so the
  // initial value is already the final one and no cascading render happens.
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

  const login = useCallback(
    async (email: string, password: string, isDemo: boolean) => {
      setSubmitting(true);
      setLoginError("");
      try {
        await signInWithEmailAndPassword(requireAuth(), email, password);
      } catch (error) {
        // The demo account is created on first use rather than seeded.
        const isMissingAccount =
          error instanceof FirebaseError &&
          (error.code === "auth/user-not-found" ||
            error.code === "auth/invalid-credential");

        if (isDemo && isMissingAccount) {
          try {
            await createUserWithEmailAndPassword(
              requireAuth(),
              email,
              password
            );
          } catch (createError) {
            setLoginError(message(createError));
          }
        } else {
          setLoginError(message(error));
        }
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

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
      continueAsGuest,
      logout,
    }),
    [user, loading, submitting, loginError, login, continueAsGuest, logout]
  );
}
