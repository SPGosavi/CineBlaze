"use client";

import Link from "next/link";
import { LogIn, User as UserIcon } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

export default function MobileAccountButton() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-paper-3/40" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-rule bg-paper-3/40 text-muted transition-colors hover:text-ink hover:bg-paper-3 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
        aria-label="Sign in"
      >
        <LogIn size={15} aria-hidden="true" />
      </Link>
    );
  }

  const initial = user.email?.[0]?.toUpperCase() ?? "G";

  return (
    <Link
      href="/settings"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-rule bg-paper-3/40 text-xs font-body font-medium text-ink transition-colors hover:bg-paper-3 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
      aria-label="Account Settings"
    >
      {user.isAnonymous ? <UserIcon size={15} aria-hidden="true" /> : initial}
    </Link>
  );
}
