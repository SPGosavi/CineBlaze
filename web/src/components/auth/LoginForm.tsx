"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Flame, Lock, Mail, User } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import PosterMarquee from "./PosterMarquee";

const DEMO_EMAIL = "demo@moviefinder.com";
const DEMO_PASSWORD = "demo1234";

/**
 * Sign-in form.
 *
 * Redirects to `?next=` after a successful sign-in, so being bounced here
 * from a watchlist action returns you to the title you were looking at
 * instead of dumping you on the home page.
 */
export default function LoginForm() {
  const { user, loading, submitting, loginError, login, continueAsGuest } =
    useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isDemo, setIsDemo] = useState(false);

  // Open redirects are trivially exploitable, so only same-site paths are
  // honoured — "//evil.com" and "https://evil.com" are both rejected.
  const rawNext = searchParams.get("next") ?? "/";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  // Navigating is a side effect, so it cannot happen during render. This
  // covers both arriving already signed in and a sign-in completing.
  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [loading, user, router, next]);

  const toggleDemo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setIsDemo(checked);
    setEmail(checked ? DEMO_EMAIL : "");
    setPassword(checked ? DEMO_PASSWORD : "");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await login(email, password, isDemo);
  };

  const busy = submitting || loading;

  return (
    <div className="relative grid min-h-screen grid-cols-1 overflow-hidden bg-black md:grid-cols-[minmax(0,560px)_1fr]">
      <div className="relative z-10 flex items-center justify-center p-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-red-900/20 via-black to-black" />
        <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl">
          <div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-red-600 to-orange-600" />

          <div className="p-8 pb-0 text-center">
            <Link
              href="/"
              className="mx-auto mb-4 flex h-16 w-16 -rotate-3 items-center justify-center rounded-2xl bg-linear-to-tr from-red-600 to-orange-600 shadow-lg shadow-orange-900/20"
            >
              <Flame size={32} fill="white" className="text-white" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-white">
              CineBlaze
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-400">
              Sign in to save titles to your watchlist.
            </p>
          </div>

          <div className="space-y-6 p-8">
            {loginError && (
              <p
                role="alert"
                className="flex items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-900/30 p-3 text-center text-sm text-red-200"
              >
                <AlertTriangle size={16} />
                {loginError}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-xs font-bold tracking-wider text-gray-500 uppercase"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    aria-hidden
                    size={18}
                    className="absolute top-3.5 left-3 text-gray-500"
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-neutral-700 bg-black/50 p-3 pl-10 text-white transition-all outline-hidden placeholder:text-gray-600 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-xs font-bold tracking-wider text-gray-500 uppercase"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    aria-hidden
                    size={18}
                    className="absolute top-3.5 left-3 text-gray-500"
                  />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-neutral-700 bg-black/50 p-3 pl-10 text-white transition-all outline-hidden placeholder:text-gray-600 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="demo"
                  type="checkbox"
                  checked={isDemo}
                  onChange={toggleDemo}
                  className="h-4 w-4 rounded border-neutral-600 bg-black text-red-600 focus:ring-red-500 focus:ring-offset-black"
                />
                <label
                  htmlFor="demo"
                  className="cursor-pointer text-sm text-gray-400 select-none hover:text-gray-300"
                >
                  Use demo credentials
                </label>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-linear-to-r from-red-600 to-orange-600 py-3.5 font-bold text-white shadow-lg shadow-orange-900/20 transition-all hover:from-red-500 hover:to-orange-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Authenticating…" : "Sign in"}
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800" />
              </div>
              <span className="relative bg-neutral-900 px-4 text-xs font-semibold text-gray-500 uppercase">
                Or
              </span>
            </div>

            <button
              type="button"
              onClick={() => void continueAsGuest()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 py-3.5 font-bold text-gray-300 transition-all hover:bg-neutral-700 hover:text-white disabled:opacity-50"
            >
              <User size={18} /> Continue as guest
            </button>

            <p className="text-center text-sm">
              <Link href="/" className="text-gray-500 hover:text-gray-300">
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
