"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { SanitizedMedia } from "@cineblaze/shared";

export interface StremioButtonProps {
  item: SanitizedMedia;
  className?: string;
}

/**
 * Resolves an IMDb / Cinemeta identifier directly from Stremio's public Cinemeta catalog.
 * Runs client-side as a fast fallback when the item's `imdb_id` is not pre-populated.
 */
export async function resolveCinemetaId(
  title: string,
  mediaType: string,
  year?: string
): Promise<string | null> {
  if (!title) return null;
  const stremioType = mediaType === "tv" ? "series" : "movie";
  const url = `https://v3-cinemeta.strem.io/catalog/${stremioType}/top/search=${encodeURIComponent(
    title
  )}.json`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      metas?: Array<{ id: string; name: string; year?: string | number }>;
    };
    if (!data?.metas || data.metas.length === 0) return null;

    const cleanTitle = title.trim().toLowerCase();
    const cleanYear = year ? String(year).trim() : null;

    if (cleanYear) {
      const exact = data.metas.find(
        (m) =>
          m.id?.startsWith("tt") &&
          m.name?.trim().toLowerCase() === cleanTitle &&
          String(m.year).includes(cleanYear)
      );
      if (exact) return exact.id;
    }

    const exactTitle = data.metas.find(
      (m) =>
        m.id?.startsWith("tt") && m.name?.trim().toLowerCase() === cleanTitle
    );
    if (exactTitle) return exactTitle.id;

    const firstValid = data.metas.find((m) => m.id?.startsWith("tt"));
    return firstValid?.id ?? null;
  } catch {
    return null;
  }
}

export function getStremioUrls(
  item: SanitizedMedia,
  overrideImdbId?: string | null
): {
  appUrl: string;
  webUrl: string;
} {
  const isSeries = item.media_type === "tv";
  const type = isSeries ? "series" : "movie";
  const imdbId = (overrideImdbId || item.imdb_id)?.trim();

  if (imdbId && /^tt\d+$/i.test(imdbId)) {
    // For movies: detail/movie/{imdb_id}/{imdb_id}
    // For series: detail/series/{imdb_id} (Stremio treats the 2nd param as videoId; duplicating imdb_id causes redirect to search)
    const pathSuffix = isSeries ? imdbId : `${imdbId}/${imdbId}`;
    return {
      appUrl: `stremio:///detail/${type}/${pathSuffix}`,
      webUrl: `https://web.stremio.com/#/detail/${type}/${pathSuffix}`,
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
  const [resolvedId, setResolvedId] = useState<string | null>(
    item.imdb_id && /^tt\d+$/i.test(item.imdb_id.trim())
      ? item.imdb_id.trim()
      : null
  );

  useEffect(() => {
    if (resolvedId) return;
    let isCancelled = false;
    const year = item.release_date?.split("-")[0];
    resolveCinemetaId(item.title, item.media_type, year).then((id) => {
      if (!isCancelled && id) {
        setResolvedId(id);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [item.title, item.media_type, item.release_date, resolvedId]);

  const { appUrl, webUrl } = getStremioUrls(item, resolvedId);

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (opening) return;
      setOpening(true);

      let currentId = resolvedId;
      if (!currentId) {
        const year = item.release_date?.split("-")[0];
        currentId = await resolveCinemetaId(item.title, item.media_type, year);
        if (currentId) {
          setResolvedId(currentId);
        }
      }

      const { appUrl: targetAppUrl, webUrl: targetWebUrl } = getStremioUrls(
        item,
        currentId
      );

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
      window.location.href = targetAppUrl;

      // Fallback timer: if the app is not installed, browser stays focused
      window.setTimeout(() => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        window.removeEventListener("blur", handleWindowBlur);
        setOpening(false);

        if (!appOpened) {
          window.open(targetWebUrl, "_blank", "noopener,noreferrer");
        }
      }, 1500);
    },
    [item, opening, resolvedId]
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
