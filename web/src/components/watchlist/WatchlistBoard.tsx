"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { WatchlistItem, MediaType } from "@cineblaze/shared";
import { firebaseInitialized } from "@/lib/firebase";
import { useWatchlistContext } from "@/contexts/WatchlistContext";
import GenreFilter from "@/components/watchlist/GenreFilter";
import KanbanColumn from "@/components/watchlist/KanbanColumn";

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
  } = useWatchlistContext();

  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [genre, setGenre] = useState("All");

  const byType = useMemo(
    () => watchlist.filter((item) => item.media_type === mediaType),
    [watchlist, mediaType]
  );

  const genres = useMemo(() => {
    const unique = new Set<string>();
    byType.forEach((item) => item.genres.forEach((g) => unique.add(g)));
    return ["All", ...Array.from(unique).sort()];
  }, [byType]);

  const filtered = useMemo(
    () =>
      genre === "All"
        ? byType
        : byType.filter((item) => item.genres.includes(genre)),
    [byType, genre]
  );

  const byStatus = (status: WatchlistItem["status"]) =>
    filtered.filter((item) => item.status === status);

  const switchType = (next: MediaType) => {
    setMediaType(next);
    setGenre("All");
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
          <div className="flex items-center gap-4">
            <GenreFilter genres={genres} selected={genre} onChange={setGenre} />
            <span className="text-xs font-medium tracking-wider text-gray-500 uppercase">
              {filtered.length} titles
            </span>
          </div>
        </div>

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
          {mediaType === "tv" && (
            <KanbanColumn
              title="Watching now"
              status="watching"
              items={byStatus("watching")}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDropInColumn={onDropInColumn}
              onDropOnCard={reorder}
            />
          )}
          <KanbanColumn
            title="Want to watch"
            status="want"
            items={byStatus("want")}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDropInColumn={onDropInColumn}
            onDropOnCard={reorder}
          />
          <KanbanColumn
            title="Watched"
            status="watched"
            items={byStatus("watched")}
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
