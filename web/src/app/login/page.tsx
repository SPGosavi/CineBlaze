import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";
import FullPageSpinner from "@/components/ui/FullPageSpinner";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to CineBlaze to save titles to your watchlist.",
  robots: { index: false, follow: false },
};

/**
 * Sits outside the `(main)` route group, so it renders full-bleed with no
 * sidebar.
 *
 * The Suspense boundary is required: `LoginForm` reads `useSearchParams`,
 * which opts the subtree into client-side rendering and would otherwise force
 * the whole route to be dynamic.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <LoginForm />
    </Suspense>
  );
}
