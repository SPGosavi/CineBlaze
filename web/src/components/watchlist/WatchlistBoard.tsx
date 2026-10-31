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
import {
  WatchlistDragProvider,
  useWatchlistDrag,
} from "@/contexts/WatchlistDragContext";
import FacetFilter from "@/components/watchlist/FacetFilter";
import KanbanColumn from "@/components/watchlist/KanbanColumn";
import { getLanguageName } from "@/lib/language";
import { releaseYear } from "@/lib/sanitize";
import Button from "@/components/ui/Button";
import Label from "@/components/ui/Label";
import Figure from "@/components/ui/Figure";

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

interface MobileStatusTabsProps {
  mobileStatus: WatchlistStatus;
  setMobileStatus: (status: WatchlistStatus) => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDropInColumn: (
    event: React.DragEvent<HTMLElement>,
    status: WatchlistStatus
  ) => void;
}

function MobileStatusTabs({
  mobileStatus,
  setMobileStatus,
  onDragOver,
  onDropInColumn,
}: MobileStatusTabsProps) {
  const { isTouchDragging, draggedItem, dragTarget } = useWatchlistDrag();

  return (
    <div
      role="tablist"
      aria-label="Watchlist status"
      className="flex w-full gap-1 rounded-full border border-rule bg-paper-2 p-1 md:hidden"
    >
      {(["want", "watched"] as const).map((status) => {
        const isDropTarget =
          isTouchDragging &&
          dragTarget?.type === "status" &&
          dragTarget.status === status &&
          draggedItem !== null &&
          draggedItem.status !== status;

        return (
          <button
            key={status}
            role="tab"
            aria-selected={mobileStatus === status}
            data-watchlist-status-target={status}
            onClick={() => setMobileStatus(status)}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOver(e);
            }}
            onDrop={(e) => {
              onDropInColumn(e, status);
            }}
            className={`relative flex-1 rounded-full px-4 py-2 font-body text-xs sm:text-sm font-medium transition-colors duration-short focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-1 active:translate-y-[1px] ${
              isDropTarget
                ? "bg-accent/20 border border-accent text-accent"
                : mobileStatus === status
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "text-muted hover:text-ink hover:bg-paper-3/50"
            }`}
          >
            {status === "want" ? "Want to watch" : "Watched"}
            {isDropTarget && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2 py-0.5 text-[9px] font-medium text-accent-ink shadow">
                Drop to move
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function WatchlistBoard() {
  const {
    watchlist,
    ready,
    error,
    setStatus,
    reorder,
    onDragStart,
    onDragOver,
    onDropInColumn,
  } = useWatchlistContext();

  const [mediaType, setMediaType] = useSessionState<MediaType>(
    "cineblaze:watchlist:type",
    "movie"
  );
  const [genre, setGenre] = useSessionState<string>(
    "cineblaze:watchlist:genre",
    "All"
  );
  const [language, setLanguage] = useSessionState<string>(
    "cineblaze:watchlist:lang",
    "All"
  );
  const [decade, setDecade] = useSessionState<string>(
    "cineblaze:watchlist:decade",
    "All"
  );
  const [mobileStatus, setMobileStatus] = useState<WatchlistStatus>("want");

  const switchType = (type: MediaType) => {
    setMediaType(type);
    setGenre("All");
    setLanguage("All");
    setDecade("All");
  };

  const byType = useMemo(
    () => watchlist.filter((item) => item.media_type === mediaType),
    [watchlist, mediaType]
  );

  const genres = useMemo(() => {
    const set = new Set<string>();
    byType.forEach((item) => item.genres.forEach((g) => set.add(g)));
    return ["All", ...Array.from(set).sort()];
  }, [byType]);

  const languages = useMemo(() => {
    const set = new Set<string>();
    byType.forEach((item) => {
      const name = getLanguageName(item.original_language);
      if (name) set.add(name);
    });
    return ["All", ...Array.from(set).sort()];
  }, [byType]);

  const decades = useMemo(() => {
    const set = new Set<string>();
    byType.forEach((item) => {
      const year = releaseYear(item);
      if (year && year !== "Unknown") {
        set.add(`${year.slice(0, 3)}0s`);
      }
    });
    return ["All", ...Array.from(set).sort().reverse()];
  }, [byType]);

  const filtered = useMemo(() => {
    return byType.filter((item) => {
      if (genre !== "All" && !item.genres.includes(genre)) return false;
      if (
        language !== "All" &&
        getLanguageName(item.original_language) !== language
      ) {
        return false;
      }
      if (decade !== "All") {
        const year = releaseYear(item);
        if (!year || `${year.slice(0, 3)}0s` !== decade) return false;
      }
      return true;
    });
  }, [byType, genre, language, decade]);

  const byStatus = (status: WatchlistStatus) =>
    filtered.filter((item) => item.status === status);

  return (
    <WatchlistDragProvider onReorder={reorder} onSetStatus={setStatus}>
      <div className="flex h-full flex-col font-body text-ink">
        <header className="mb-6 flex flex-col gap-4 border-b border-rule pb-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <h1 className="font-display text-2xl font-medium tracking-tight text-ink md:text-3xl">
              My Watchlist
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
              <Label size="xs" className="ml-2">
                <Figure
                  value={filtered.length}
                  size="sm"
                  className="font-medium"
                />{" "}
                titles
              </Label>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            {/* Movies vs TV series segmented control */}
            <div
              role="tablist"
              className="flex w-full gap-1 rounded-full border border-rule bg-paper-2 p-1 md:w-auto"
            >
              {(["movie", "tv"] as const).map((type) => (
                <button
                  key={type}
                  role="tab"
                  aria-selected={mediaType === type}
                  onClick={() => switchType(type)}
                  className={`flex-1 rounded-full px-5 py-1.5 font-body text-xs sm:text-sm font-medium transition-colors duration-short focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-1 active:translate-y-[1px] md:flex-none ${
                    mediaType === type
                      ? "bg-accent text-accent-ink shadow-sm"
                      : "text-muted hover:text-ink hover:bg-paper-3/50"
                  }`}
                >
                  {type === "movie" ? "Movies" : "TV series"}
                </button>
              ))}
            </div>

            <MobileStatusTabs
              mobileStatus={mobileStatus}
              setMobileStatus={setMobileStatus}
              onDragOver={onDragOver}
              onDropInColumn={onDropInColumn}
            />
          </div>
        </header>

        {error && (
          <p className="mb-4 flex items-center gap-2 rounded-lg border border-error/40 bg-error/10 px-4 py-3 font-body text-sm text-error">
            <AlertTriangle size={16} aria-hidden="true" /> {error}
          </p>
        )}

        {!ready ? (
          <div className="flex flex-1 flex-col gap-6 md:flex-row">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-64 flex-1 animate-pulse rounded-well border border-rule bg-paper-2/40"
              />
            ))}
          </div>
        ) : watchlist.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-well border border-rule bg-paper-2/40 py-16 text-center">
            <h2 className="font-display font-medium text-lg text-ink">
              Your watchlist is empty
            </h2>
            <p className="max-w-sm font-body text-sm text-muted">
              Find something on the discover page and save it here.
            </p>
            <Button href="/" variant="ember" size="app" className="mt-2">
              Discover titles
            </Button>
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
    </WatchlistDragProvider>
  );
}
