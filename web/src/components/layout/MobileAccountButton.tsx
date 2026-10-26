"use client";

import Link from "next/link";
import { LogIn, User as UserIcon } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

export default function MobileAccountButton() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-800" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-gray-400 transition-colors hover:border-red-600/40 hover:text-white"
        aria-label="Sign in"
      >
        <LogIn size={15} />
      </Link>
    );
  }

  const initial = user.email?.[0]?.toUpperCase() ?? "G";

  return (
    <Link
      href="/settings"
      className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-neutral-700 to-neutral-800 text-xs font-bold text-white shadow transition-transform active:scale-95"
      aria-label="Account Settings"
    >
      {user.isAnonymous ? <UserIcon size={15} /> : initial}
    </Link>
  );
}
