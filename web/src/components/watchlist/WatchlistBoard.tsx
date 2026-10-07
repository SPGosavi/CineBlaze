"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Filter, Languages, CalendarRange } from "lucide-react";
import type {
  WatchlistItem,
  MediaType,
  WatchlistStatus,
} from "@cineblaze/shared";
import { firebaseInitialized } from "@/lib/firebase";
import { useWatchlistContext } from "@/contexts/WatchlistContext";
import FacetFilter from "@/components/watchlist/FacetFilter";
import KanbanColumn from "@/components/watchlist/KanbanColumn";
import { getLanguageName } from "@/lib/language";
import { releaseYear } from "@/lib/sanitize";

function useSessionState<T extends string>(
  key: string,
  defaultValue: T
): [T, (val: T) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) return stored as T;
    }
    return defaultValue;
  });

  useEffect(() => {
    sessionStorage.setItem(key, state);
  }, [key, state]);

  return [state, setState];
}

/**
 * Kanban watchlist board.
 *
 * Fully client-side: it needs the signed-in user and a live Firestore
 * subscription, neither of which the server can see, and drag-and-drop is
 * inherently interactive. This is the one route in the app with nothing to
 * prerender.
 */
export default function WatchlistBoard() {
  const {
    watchlist,
    ready,
    error,
    onDragStart,
    onDragOver,
    onDropInColumn,
    reorder,
    setStatus,
  } = useWatchlistContext();

  const [mediaType, setMediaType] = useSessionState<MediaType>(
    "watchlist_mediaType",
    "movie"
  );
  const [genre, setGenre] = useSessionState<string>("watchlist_genre", "All");
  const [language, setLanguage] = useSessionState<string>(
    "watchlist_language",
    "All"
  );
  const [decade, setDecade] = useSessionState<string>(
    "watchlist_decade",
    "All"
  );
  const [mobileStatus, setMobileStatus] = useSessionState<WatchlistStatus>(
    "watchlist_mobileStatus",
    "want"
  );

  const byType = useMemo(
    () => watchlist.filter((item) => item.media_type === mediaType),
    [watchlist, mediaType]
  );

  const genres = useMemo(() => {
    const unique = new Set<string>();
    byType.forEach((item) => item.genres.forEach((g) => unique.add(g)));
    return ["All", ...Array.from(unique).sort()];
  }, [byType]);

  const languages = useMemo(() => {
    const unique = new Set<string>();
    byType.forEach((item) => {
      const name = getLanguageName(item.original_language);
      unique.add(name || "Unknown");
    });
    return ["All", ...Array.from(unique).sort()];
  }, [byType]);

  const toDecade = (item: WatchlistItem): string | null => {
    const year = Number(releaseYear(item));
    if (!Number.isFinite(year) || year < 1900) return null;
    return `${Math.floor(year / 10) * 10}s`;
  };

  const decades = useMemo(() => {
    const unique = new Set<string>();
    byType.forEach((item) => {
      const d = toDecade(item);
      if (d) unique.add(d);
    });
    // Newest first — a watchlist skews recent, so 2020s should lead.
    return ["All", ...Array.from(unique).sort().reverse()];
  }, [byType]);

  const filtered = useMemo(
    () =>
      byType.filter(
        (item) =>
          (genre === "All" || item.genres.includes(genre)) &&
          (language === "All" ||
            (getLanguageName(item.original_language) || "Unknown") ===
              language) &&
          (decade === "All" || toDecade(item) === decade)
      ),
    [byType, genre, language, decade]
  );

  const byStatus = (status: WatchlistItem["status"]) =>
    filtered.filter((item) => item.status === status);

  const switchType = (next: MediaType) => {
    setMediaType(next);
    setGenre("All");
    setLanguage("All");
    setDecade("All");
  };

  if (!firebaseInitialized) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-gray-400">
        <AlertTriangle size={48} className="mb-4 text-orange-500" />
        <h2 className="mb-2 text-xl font-bold text-white">
          Feature unavailable
        </h2>
        <p>Add your Firebase config to use the watchlist.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in relative flex h-full flex-col pb-20 md:pb-0">
      <header className="mb-8 flex flex-col items-start justify-between gap-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-white">
            My watchlist
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <FacetFilter
              options={genres}
              selected={genre}
              onChange={setGenre}
              label="Genre"
              icon={Filter}
            />
            <FacetFilter
              options={languages}
              selected={language}
              onChange={setLanguage}
              label="Language"
              icon={Languages}
            />
            <FacetFilter
              options={decades}
              selected={decade}
              onChange={setDecade}
              label="Decade"
              icon={CalendarRange}
            />
            <span className="text-xs font-medium tracking-wider text-gray-500 uppercase">
              {filtered.length} titles
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row">
          <div
            role="tablist"
            className="flex w-full gap-1 rounded-xl border border-neutral-800 bg-black p-1.5 shadow-inner md:w-auto"
          >
            {(["movie", "tv"] as const).map((type) => (
              <button
                key={type}
                role="tab"
                aria-selected={mediaType === type}
                onClick={() => switchType(type)}
                className={`flex-1 rounded-lg px-6 py-2.5 text-sm font-bold transition-all md:flex-none ${
                  mediaType === type
                    ? type === "movie"
                      ? "bg-red-600 text-white shadow-lg shadow-red-900/30"
                      : "bg-orange-600 text-white shadow-lg shadow-orange-900/30"
                    : "text-gray-500 hover:bg-white/5 hover:text-white"
                }`}
              >
                {type === "movie" ? "Movies" : "TV series"}
              </button>
            ))}
          </div>

          <div
            role="tablist"
            aria-label="Watchlist status"
            className="flex w-full gap-1 rounded-xl border border-neutral-800 bg-black p-1.5 shadow-inner md:hidden"
          >
            {(["want", "watched"] as const).map((status) => (
              <button
                key={status}
                role="tab"
                aria-selected={mobileStatus === status}
                onClick={() => setMobileStatus(status)}
                className={`flex-1 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${
                  mobileStatus === status
                    ? "bg-neutral-800 text-white shadow-lg"
                    : "text-gray-500 hover:bg-white/5 hover:text-white"
                }`}
              >
                {status === "want" ? "Want to watch" : "Watched"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle size={16} /> {error}
        </p>
      )}

      {!ready ? (
        <div className="flex flex-1 flex-col gap-6 md:flex-row">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="h-64 flex-1 animate-pulse rounded-xl bg-neutral-900/50"
            />
          ))}
        </div>
      ) : watchlist.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 py-16 text-center">
          <h2 className="text-lg font-bold text-gray-200">
            Your watchlist is empty
          </h2>
          <p className="max-w-sm text-sm text-gray-500">
            Find something on the discover page and hit the plus button to save
            it here.
          </p>
          <Link
            href="/"
            className="mt-2 rounded-xl bg-linear-to-r from-red-600 to-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:from-red-500 hover:to-orange-500"
          >
            Discover titles
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-6 overflow-hidden md:flex-row">
          <KanbanColumn
            title="Want to watch"
            status="want"
            className={mobileStatus === "want" ? "" : "hidden md:flex"}
            items={byStatus("want")}
            onMove={setStatus}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDropInColumn={onDropInColumn}
            onDropOnCard={reorder}
          />
          <KanbanColumn
            title="Watched"
            status="watched"
            className={mobileStatus === "watched" ? "" : "hidden md:flex"}
            items={byStatus("watched")}
            onMove={setStatus}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDropInColumn={onDropInColumn}
            onDropOnCard={reorder}
          />
        </div>
      )}
    </div>
  );
}
