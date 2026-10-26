"use client";

import Link from "next/link";
import { LogIn, LogOut, Sliders, User as UserIcon } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

export default function SettingsPanel() {
  const { user, loading, logout } = useAuthContext();

  const initial = user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="animate-fade-in mx-auto max-w-2xl space-y-8 py-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage your account profile and application preferences.
        </p>
      </div>

      {/* Account Section */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Account Profile
        </h2>

        {loading ? (
          <div className="mt-4 flex items-center gap-4 animate-pulse">
            <div className="h-14 w-14 rounded-full bg-neutral-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-neutral-800" />
              <div className="h-3 w-48 rounded bg-neutral-800" />
            </div>
          </div>
        ) : user ? (
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-neutral-700 to-neutral-800 text-xl font-bold text-white shadow-inner">
                {user.isAnonymous ? <UserIcon size={26} /> : initial}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-base font-bold text-white">
                  {user.isAnonymous
                    ? "Guest User"
                    : user.displayName || user.email}
                </p>
                <p className="truncate text-sm text-gray-400">
                  {user.email ?? "Signed in anonymously"}
                </p>
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-md border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-xs font-medium text-gray-300">
                    {user.isAnonymous ? "Guest Session" : "Email Account"}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:border-red-500/60 hover:bg-red-500/20 hover:text-red-300 active:scale-95"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-xl border border-dashed border-neutral-800 p-6 text-center sm:flex-row sm:text-left">
            <div>
              <p className="font-semibold text-white">Not signed in</p>
              <p className="text-sm text-gray-400">
                Sign in to sync your watchlist across all devices.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-red-600 to-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-900/20 transition-all hover:from-red-500 hover:to-orange-500 active:scale-95"
            >
              <LogIn size={16} />
              Sign in
            </Link>
          </div>
        )}
      </section>

      {/* Preferences Section */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          <Sliders size={14} />
          <h2>Preferences</h2>
        </div>
        <div className="mt-4 rounded-xl border border-neutral-800/80 bg-black/30 p-4">
          <p className="text-sm font-medium text-gray-300">
            Display & Filtering
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Content rating, default streaming regions, and theme customization
            are coming soon.
          </p>
        </div>
      </section>
    </div>
  );
}
