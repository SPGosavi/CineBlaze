"use client";

import { useCallback, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { SanitizedMedia } from "@cineblaze/shared";

export interface StremioButtonProps {
  item: SanitizedMedia;
  className?: string;
}

export function getStremioUrls(item: SanitizedMedia): {
  appUrl: string;
  webUrl: string;
} {
  const type = item.media_type === "tv" ? "series" : "movie";
  const imdbId = item.imdb_id?.trim();

  if (imdbId && /^tt\d+$/i.test(imdbId)) {
    return {
      appUrl: `stremio:///detail/${type}/${imdbId}/${imdbId}`,
      webUrl: `https://web.stremio.com/#/detail/${type}/${imdbId}/${imdbId}`,
    };
  }

  // Fallback to title search if direct IMDb identifier is unavailable
  const query = encodeURIComponent(item.title);
  return {
    appUrl: `stremio:///search?search=${query}`,
    webUrl: `https://web.stremio.com/#/search?search=${query}`,
  };
}

/**
 * Watch on Stremio action button.
 *
 * Attempts to launch the native Stremio app via custom protocol (`stremio:///detail/...`).
 * If the application is not installed, seamlessly falls back to Stremio Web (`web.stremio.com`)
 * in the browser.
 */
export default function StremioButton({
  item,
  className = "",
}: StremioButtonProps) {
  const [opening, setOpening] = useState(false);
  const { appUrl, webUrl } = getStremioUrls(item);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (opening) return;
      setOpening(true);

      let appOpened = false;

      const handleVisibilityChange = () => {
        if (document.hidden || document.visibilityState === "hidden") {
          appOpened = true;
        }
      };

      const handleWindowBlur = () => {
        appOpened = true;
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("blur", handleWindowBlur);

      // Attempt to launch installed Stremio application
      window.location.href = appUrl;

      // Fallback timer: if the app is not installed, browser stays focused
      window.setTimeout(() => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        window.removeEventListener("blur", handleWindowBlur);
        setOpening(false);

        if (!appOpened) {
          window.open(webUrl, "_blank", "noopener,noreferrer");
        }
      }, 1500);
    },
    [appUrl, webUrl, opening]
  );

  return (
    <a
      href={webUrl}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full border border-rule bg-paper-2 px-3 py-1.5 font-body text-xs font-medium text-ink transition-colors hover:border-[#685CEE]/60 hover:text-[#9B8CFF] hover:bg-paper-3 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:translate-y-[1px] ${className}`}
    >
      <img
        src="/icons/stremio.svg"
        alt=""
        width={18}
        height={18}
        className="h-4.5 w-4.5 shrink-0 rounded-full"
        draggable={false}
      />
      <span>Stremio</span>
      <ExternalLink size={12} aria-hidden="true" className="text-muted" />
      <span className="sr-only">
        (opens {item.title} in Stremio application or web client)
      </span>
    </a>
  );
}
