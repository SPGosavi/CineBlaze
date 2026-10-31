"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, Search, Settings, type LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  shortLabel: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: Search, label: "Discover", shortLabel: "Discover" },
  {
    href: "/watchlist",
    icon: List,
    label: "My Watchlist",
    shortLabel: "Watchlist",
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
    shortLabel: "Settings",
  },
];

/**
 * Navigation shared by the desktop sidebar and the mobile bottom bar.
 */
export default function NavLinks({ short = false }: { short?: boolean }) {
  const pathname = usePathname();

  return (
    <>
      {NAV_ITEMS.map(({ href, icon: Icon, label, shortLabel }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group relative flex w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 font-body font-medium transition-colors duration-short focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 ${
              active
                ? "text-ink bg-paper-3/50 md:bg-paper-3/40"
                : "text-muted hover:text-ink hover:bg-paper-3/30"
            }`}
          >
            {/* Desktop ember rule indicator on active destination */}
            {active && (
              <span
                className="hidden md:block absolute left-0 top-2 bottom-2 w-1 rounded-full bg-accent"
                aria-hidden="true"
              />
            )}
            <Icon
              size={20}
              className={`shrink-0 transition-colors ${
                active ? "text-accent" : "text-muted group-hover:text-ink"
              }`}
              aria-hidden="true"
            />
            <span className="text-[11px] md:text-sm font-normal md:font-medium">
              {short ? shortLabel : label}
            </span>
            {/* Mobile active indicator dot */}
            {active && (
              <span
                className="md:hidden block w-1 h-1 rounded-full bg-accent mt-0.5"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </>
  );
}
