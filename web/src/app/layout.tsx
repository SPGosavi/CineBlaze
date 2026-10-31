import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/constants";
import Providers from "./providers";
import WebVitals from "@/components/analytics/WebVitals";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const boska = localFont({
  src: "./fonts/Boska-Medium.woff2",
  variable: "--font-boska",
  display: "swap",
  weight: "500",
});

export const metadata: Metadata = {
  // Makes every relative `openGraph.url` and `alternates.canonical` below
  // resolve against the real origin.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — AI movie and TV discovery`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  keywords: [
    "movie search",
    "AI movie finder",
    "find a movie by plot",
    "TV series recommendations",
    "watchlist tracker",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — AI movie and TV discovery`,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — AI movie and TV discovery`,
    description: SITE_DESCRIPTION,
  },
  /*
   * No explicit `robots` here — Next emits `index, follow` by default, so
   * restating it only duplicated the tag. Pages that must not be indexed
   * (/login, /watchlist, /settings, /search) opt out individually.
   */
};

export const viewport: Viewport = {
  themeColor: "#191716",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Next 16 no longer neutralises `scroll-behavior: smooth` during
      // navigation unless this attribute is present.
      data-scroll-behavior="smooth"
      className={`${geist.variable} ${geistMono.variable} ${boska.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">
        {/*
          The app shell lives in the `(main)` route group's layout rather than
          here, so /login can render full-bleed without a sidebar wrapped
          around it.
        */}
        <Providers>{children}</Providers>
        <WebVitals />
      </body>
    </html>
  );
}
