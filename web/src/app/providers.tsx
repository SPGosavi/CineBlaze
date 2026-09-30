"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { WatchlistProvider } from "@/contexts/WatchlistContext";

/**
 * Single client boundary for the whole app.
 *
 * Keeping the providers in one `"use client"` file means `layout.tsx` itself
 * stays a Server Component, so page metadata and the static chrome are still
 * rendered on the server.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WatchlistProvider>{children}</WatchlistProvider>
    </AuthProvider>
  );
}
