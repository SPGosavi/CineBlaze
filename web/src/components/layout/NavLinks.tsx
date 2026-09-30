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
 *
 * Uses `<Link>` rather than an imperative `router.push`, so each destination
 * is a real crawlable href and Next can prefetch it on hover.
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
            className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 font-medium transition-all duration-200 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 ${
              active
                ? "text-red-500 md:border md:border-red-600/20 md:bg-red-600/10"
                : "text-gray-500 hover:bg-white/5 hover:text-gray-200"
            }`}
          >
            <Icon
              size={24}
              strokeWidth={active ? 2.5 : 2}
              className="md:h-5 md:w-5"
            />
            <span className="text-[10px] md:text-sm">
              {short ? shortLabel : label}
            </span>
          </Link>
        );
      })}
    </>
  );
}
