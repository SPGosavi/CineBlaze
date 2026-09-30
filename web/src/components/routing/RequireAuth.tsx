"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import FullPageSpinner from "@/components/ui/FullPageSpinner";

/**
 * Client-side auth gate.
 *
 * Firebase Auth keeps its session in IndexedDB, not a cookie, so the server
 * has no way to know who the user is — the redirect has to happen after
 * hydration. That is also why the gate waits for `loading` to resolve: without
 * it, a signed-in user would be bounced to /login on every refresh.
 *
 * Only /watchlist uses this. Discovery, search and detail pages are public so
 * they can be crawled.
 */
export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) return <FullPageSpinner />;

  return <>{children}</>;
}
