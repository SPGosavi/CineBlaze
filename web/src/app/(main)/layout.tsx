import AppShell from "@/components/layout/AppShell";

/**
 * Layout for everything except /login: sidebar, mobile chrome, scroll
 * container.
 *
 * This is a route group, so `(main)` contributes nothing to the URL — `/`,
 * `/search`, `/watchlist` and `/movie/123` all live here.
 */
export default function MainLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
