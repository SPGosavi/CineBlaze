import Link from "next/link";
import { Flame } from "lucide-react";
import NavLinks from "./NavLinks";
import AccountPanel from "./AccountPanel";

/**
 * App shell: desktop sidebar, mobile top bar and mobile bottom bar.
 *
 * A Server Component — only the pieces that need the URL or auth state
 * (`NavLinks`, `AccountPanel`) are client islands.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black font-sans text-gray-100 md:flex-row">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-800 bg-black p-4 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-tr from-red-600 to-orange-600 text-white shadow-lg shadow-orange-900/20">
            <Flame size={20} fill="white" />
          </span>
          <span className="text-lg font-black tracking-tight">CineBlaze</span>
        </Link>
      </header>

      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-neutral-800 bg-black md:flex">
        <Link href="/" className="flex items-center gap-3 p-6">
          <span className="flex h-9 w-9 -rotate-3 items-center justify-center rounded-xl bg-linear-to-tr from-red-600 to-orange-600 text-white shadow-lg shadow-orange-900/20">
            <Flame size={24} fill="white" />
          </span>
          <span className="text-xl font-black tracking-tight text-white">
            CineBlaze
          </span>
        </Link>

        <nav className="mt-4 flex-1 space-y-1 px-4">
          <NavLinks />
        </nav>

        <div className="border-t border-neutral-800 p-4">
          <AccountPanel />
        </div>
      </aside>

      <main className="scrollbar-thin relative flex-1 overflow-y-auto bg-neutral-950">
        <div className="mx-auto min-h-full max-w-7xl p-4 md:p-10">
          {children}
        </div>
      </main>

      <nav className="pb-safe fixed bottom-0 z-30 flex w-full justify-around border-t border-neutral-800 bg-black/90 p-2 backdrop-blur-lg md:hidden">
        <NavLinks short />
      </nav>
    </div>
  );
}
