import type { Metadata } from "next";
import RequireAuth from "@/components/routing/RequireAuth";
import WatchlistBoard from "@/components/watchlist/WatchlistBoard";

export const metadata: Metadata = {
  title: "My watchlist",
  description:
    "Track what you want to watch, what you are watching, and what you have finished.",
  // Personal and auth-gated: nothing here is worth indexing, and a crawler
  // would only ever see the signed-out spinner anyway.
  robots: { index: false, follow: false },
};

export default function WatchlistPage() {
  return (
    <RequireAuth>
      <WatchlistBoard />
    </RequireAuth>
  );
}
