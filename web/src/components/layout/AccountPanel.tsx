"use client";

import Link from "next/link";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

/**
 * Account block at the foot of the sidebar.
 *
 * Unlike Phase 2 the whole app is no longer behind a login wall, so this has
 * to render a signed-out state as well.
 */
export default function AccountPanel() {
  const { user, loading, logout } = useAuthContext();

  if (loading) {
    return <div className="h-16 animate-pulse rounded-xl bg-neutral-900" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-3 font-bold text-gray-300 transition-colors hover:border-red-600/40 hover:text-white"
      >
        <LogIn size={18} />
        Sign in
      </Link>
    );
  }

  const initial = user.email?.[0]?.toUpperCase() ?? "G";

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3 transition-colors hover:border-neutral-700">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-neutral-700 to-neutral-800 font-bold text-white transition-transform group-hover:scale-105">
        {user.isAnonymous ? <UserIcon size={20} /> : initial}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-bold text-white">
          {user.isAnonymous ? "Guest user" : "User"}
        </p>
        <p className="truncate text-xs text-gray-500">
          {user.email ?? "Anonymous"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        aria-label="Sign out"
        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-500"
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}
