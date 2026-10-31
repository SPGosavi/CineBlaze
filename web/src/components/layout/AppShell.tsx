import Link from "next/link";
import { Flame } from "lucide-react";
import NavLinks from "./NavLinks";
import AccountPanel from "./AccountPanel";
import MobileAccountButton from "./MobileAccountButton";

/**
 * App shell: desktop sidebar, mobile top bar, mobile bottom bar, and footer attribution.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper font-body text-ink md:flex-row">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-rule bg-paper-2 p-4 md:hidden">
        <Link
          href="/"
          className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 rounded-lg"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-paper-3 border border-rule text-ink">
            <Flame size={18} className="text-ink" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-medium tracking-tight text-ink">
            CineBlaze
          </span>
        </Link>
        <MobileAccountButton />
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-rule bg-paper-2 md:flex">
        <Link
          href="/"
          className="flex items-center gap-3 p-6 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 rounded-xl"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper-3 border border-rule text-ink">
            <Flame size={20} className="text-ink" aria-hidden="true" />
          </span>
          <span className="font-display text-xl font-medium tracking-tight text-ink">
            CineBlaze
          </span>
        </Link>

        <nav className="mt-2 flex-1 space-y-1 px-4">
          <NavLinks />
        </nav>

        <div className="border-t border-rule p-4">
          <AccountPanel />
        </div>
      </aside>

      {/* Main content pane */}
      <main className="scrollbar-thin relative flex-1 overflow-y-auto bg-paper flex flex-col justify-between">
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8 flex-1">
          {children}
        </div>

        {/* Footer attribution (TMDB + JustWatch terms compliance) */}
        <footer className="border-t border-rule py-6 px-4 md:px-8 text-center text-xs text-muted font-body">
          <p className="max-w-prose mx-auto">
            Film data via TMDB. Streaming availability provided by JustWatch.
            This product uses the TMDB API but is not endorsed or certified by
            TMDB.
          </p>
        </footer>
      </main>

      {/* Mobile bottom nav */}
      <nav className="pb-safe fixed bottom-0 z-30 flex w-full justify-around border-t border-rule bg-paper-2/95 p-2 backdrop-blur-md md:hidden">
        <NavLinks short />
      </nav>
    </div>
  );
}
