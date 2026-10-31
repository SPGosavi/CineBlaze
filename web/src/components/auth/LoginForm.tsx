"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Flame, Lock, Mail, User } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import PosterMarquee from "./PosterMarquee";
import Button from "@/components/ui/Button";
import Label from "@/components/ui/Label";

/**
 * Authentication form (Sign in / Sign up).
 *
 * Hero Posture: Stage (Form on columns 1-5, poster wall on columns 6-12).
 */
export default function LoginForm() {
  const {
    user,
    loading,
    submitting,
    loginError,
    login,
    signup,
    continueAsGuest,
  } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  const rawNext = searchParams.get("next") ?? "/";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [loading, user, router, next]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    if (mode === "signup") {
      if (password.length < 6) {
        setValidationError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setValidationError("Passwords do not match.");
        return;
      }
      await signup(email, password);
    } else {
      await login(email, password);
    }
  };

  const switchMode = (newMode: "signin" | "signup") => {
    setMode(newMode);
    setValidationError("");
    setPassword("");
    setConfirmPassword("");
  };

  const busy = submitting || loading;
  const displayError = validationError || loginError;

  return (
    <div className="relative grid min-h-screen grid-cols-1 overflow-hidden bg-paper text-ink md:grid-cols-2">
      <div className="relative z-10 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md rounded-well border border-rule bg-paper-2 p-8 shadow-card">
          <div className="text-center pb-2">
            <Link
              href="/"
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-paper-3 border border-rule text-ink focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:translate-y-[1px]"
            >
              <Flame size={28} className="text-ink" aria-hidden="true" />
            </Link>
            <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
              CineBlaze
            </h1>
            <p className="mt-2 text-sm font-body text-muted">
              {mode === "signin"
                ? "Sign in to save titles to your watchlist."
                : "Create an account to save titles to your watchlist."}
            </p>
          </div>

          <div className="space-y-6 pt-4">
            {displayError && (
              <p
                role="alert"
                className="flex items-center justify-center gap-2 rounded-lg border border-error/40 bg-error/10 p-3 text-center text-sm font-body text-error"
              >
                <AlertTriangle size={16} aria-hidden="true" />
                {displayError}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label as="label" htmlFor="email" size="xs">
                  Email
                </Label>
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    size={16}
                    className="absolute top-4 left-3.5 text-muted pointer-events-none"
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    className="w-full min-h-[48px] rounded-full border border-muted bg-paper px-4 pl-10 font-body text-sm text-ink placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px] active:border-muted disabled:opacity-55 disabled:cursor-not-allowed transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label as="label" htmlFor="password" size="xs">
                  Password
                </Label>
                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    size={16}
                    className="absolute top-4 left-3.5 text-muted pointer-events-none"
                  />
                  <input
                    id="password"
                    type="password"
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[48px] rounded-full border border-muted bg-paper px-4 pl-10 font-body text-sm text-ink placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px] active:border-muted disabled:opacity-55 disabled:cursor-not-allowed transition-colors"
                  />
                </div>
              </div>

              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label as="label" htmlFor="confirmPassword" size="xs">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Lock
                      aria-hidden="true"
                      size={16}
                      className="absolute top-4 left-3.5 text-muted pointer-events-none"
                    />
                    <input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="••••••••"
                      className="w-full min-h-[48px] rounded-full border border-muted bg-paper px-4 pl-10 font-body text-sm text-ink placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px] active:border-muted disabled:opacity-55 disabled:cursor-not-allowed transition-colors"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="ember"
                size="page"
                isLoading={busy}
                disabled={busy}
                className="w-full mt-2"
              >
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="text-center text-sm font-body">
              {mode === "signin" ? (
                <p className="text-muted inline-flex items-center gap-1.5 justify-center">
                  <span>Don&apos;t have an account?</span>
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="inline-flex min-h-[32px] items-center px-1 font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:translate-y-[1px] rounded whitespace-nowrap"
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p className="text-muted inline-flex items-center gap-1.5 justify-center">
                  <span>Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="inline-flex min-h-[32px] items-center px-1 font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:translate-y-[1px] rounded whitespace-nowrap"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-rule" />
              </div>
              <span className="relative bg-paper-2 px-3 text-xs font-body text-muted">
                or
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="page"
              onClick={() => void continueAsGuest()}
              disabled={busy}
              leftIcon={<User size={16} aria-hidden="true" />}
              className="w-full"
            >
              Continue as guest
            </Button>

            <p className="text-center text-xs font-body text-muted">
              <Link
                href="/"
                className="hover:text-ink focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:translate-y-[1px] rounded"
              >
                Browse without signing in
              </Link>
            </p>
          </div>
        </div>
      </div>
      <PosterMarquee />
    </div>
  );
}
