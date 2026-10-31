"use client";

import Link from "next/link";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

/**
 * Account block at the foot of the desktop sidebar.
 */
export default function AccountPanel() {
  const { user, loading, logout } = useAuthContext();

  if (loading) {
    return <div className="h-14 animate-pulse rounded-well bg-paper-3/40" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center justify-center gap-2 rounded-well border border-rule bg-paper-3/40 p-3 font-body font-medium text-sm text-ink transition-colors duration-short hover:bg-paper-3 hover:border-muted/40 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
      >
        <LogIn size={16} aria-hidden="true" />
        Sign in
      </Link>
    );
  }

  const initial = user.email?.[0]?.toUpperCase() ?? "G";

  return (
    <div className="flex items-center gap-3 rounded-well border border-rule bg-paper-3/40 p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-3 border border-rule font-body font-medium text-ink shrink-0">
        {user.isAnonymous ? <UserIcon size={18} aria-hidden="true" /> : initial}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium text-ink">
          {user.isAnonymous ? "Guest user" : "User"}
        </p>
        <p className="truncate text-xs text-muted">
          {user.email ?? "Anonymous"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        aria-label="Sign out"
        className="rounded-lg p-1.5 text-muted transition-colors hover:text-accent hover:bg-paper-3 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
      >
        <LogOut size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
