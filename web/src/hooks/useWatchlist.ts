"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import type {
  SanitizedMedia,
  WatchlistItem,
  WatchlistStatus,
} from "@cineblaze/shared";
import { firebaseInitialized, requireDb } from "@/lib/firebase";
import { sanitizeMedia } from "@/lib/sanitize";

export interface WatchlistState {
  watchlist: WatchlistItem[];
  /** False until the first Firestore snapshot for the current user arrives. */
  ready: boolean;
  error: string | null;
  isInWatchlist: (id: number) => boolean;
  add: (item: SanitizedMedia, status?: WatchlistStatus) => Promise<void>;
  remove: (id: number) => Promise<void>;
  setStatus: (id: number, status: WatchlistStatus) => Promise<void>;
  reorder: (targetId: number) => Promise<void>;
  onDragStart: (event: React.DragEvent<HTMLElement>, id: number) => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDropInColumn: (
    event: React.DragEvent<HTMLElement>,
    status: WatchlistStatus
  ) => void;
}

/** Module-level so the signed-out list keeps a stable identity across renders. */
const EMPTY: WatchlistItem[] = [];

/**
 * Resolves the Firestore document holding a user's watchlist.
 *
 * Kept in one place so the path can never drift between read and write.
 */
const watchlistDocRef = (uid: string) =>
  doc(
    requireDb(),
    "artifacts",
    "default-app-id",
    "users",
    uid,
    "data",
    "watchlist"
  );

/** Firestore stores whatever was written; re-normalise on the way out. */
const toWatchlistItem = (raw: unknown): WatchlistItem | null => {
  const sanitized = sanitizeMedia(raw);
  if (!sanitized) return null;
  return {
    ...sanitized,
    status: sanitized.status ?? "want",
    addedAt: sanitized.addedAt ?? 0,
  };
};

/** Items tagged with the uid they belong to. */
interface Store {
  uid: string;
  items: WatchlistItem[];
}

/**
 * Owns the watchlist: a live Firestore subscription plus the mutations.
 *
 * The stored state carries the uid it came from, which makes `watchlist` and
 * `ready` *derived* rather than something an effect has to reset. Signing out
 * or switching accounts invalidates the data by comparison instead of by a
 * synchronous `setState` inside an effect, which would cascade an extra
 * render on every auth change.
 *
 * Status changes and reordering write optimistically to local state before
 * hitting Firestore, so dragging stays responsive; the snapshot listener then
 * reconciles with the server copy, and a failed write rolls back.
 */
export function useWatchlist(user: User | null): WatchlistState {
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragItem = useRef<number | null>(null);

  const uid = user?.uid ?? null;
  const canSubscribe = firebaseInitialized && uid !== null;

  const synced = store !== null && store.uid === uid;
  const watchlist = synced ? store.items : EMPTY;
  const ready = !canSubscribe || synced;

  // Mutations need the current list to compute the next one, but taking it as
  // a dependency would give every handler a new identity on each snapshot and
  // defeat the memoised cards. Mirrored into a ref after commit rather than
  // during render, which React forbids.
  const watchlistRef = useRef<WatchlistItem[]>(EMPTY);
  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  useEffect(() => {
    if (!firebaseInitialized || uid === null) return;

    return onSnapshot(
      watchlistDocRef(uid),
      (snapshot) => {
        const data = snapshot.data();
        const raw = Array.isArray(data?.items) ? data.items : [];
        setStore({
          uid,
          items: raw
            .map(toWatchlistItem)
            .filter((item): item is WatchlistItem => item !== null),
        });
        setError(null);
      },
      (subscriptionError) => {
        // Previously a failed subscription was silent, so a permissions
        // problem looked identical to an empty watchlist.
        console.error(subscriptionError);
        setStore({ uid, items: [] });
        setError("Could not load your watchlist.");
      }
    );
  }, [uid]);

  const isInWatchlist = useCallback(
    (id: number) => watchlistRef.current.some((item) => item.id === id),
    []
  );

  const add = useCallback(
    async (item: SanitizedMedia, status: WatchlistStatus = "want") => {
      if (!firebaseInitialized || uid === null) return;
      if (watchlistRef.current.some((existing) => existing.id === item.id)) {
        return;
      }

      const entry: WatchlistItem = {
        id: item.id,
        title: item.title,
        poster_path: item.poster_path,
        release_date: item.release_date,
        media_type: item.media_type,
        genres: item.genres,
        director: item.director,
        cast: item.cast,
        overview: item.overview ?? "",
        vote_average: item.vote_average ?? 0,
        imdb_rating: item.imdb_rating,
        rotten_tomatoes: item.rotten_tomatoes,
        providers: item.providers,
        original_language: item.original_language,
        status,
        addedAt: Date.now(),
      };

      try {
        await setDoc(
          watchlistDocRef(uid),
          { items: arrayUnion(entry) },
          { merge: true }
        );
      } catch (writeError) {
        console.error(writeError);
        setError("Could not add that title.");
      }
    },
    [uid]
  );

  const remove = useCallback(
    async (id: number) => {
      if (!firebaseInitialized || uid === null) return;
      const item = watchlistRef.current.find((entry) => entry.id === id);
      if (!item) return;
      try {
        await updateDoc(watchlistDocRef(uid), { items: arrayRemove(item) });
      } catch (writeError) {
        console.error(writeError);
        setError("Could not remove that title.");
      }
    },
    [uid]
  );

  const setStatus = useCallback(
    async (id: number, status: WatchlistStatus) => {
      if (!firebaseInitialized || uid === null) return;
      const previous = watchlistRef.current;
      const next = previous.map((item) =>
        item.id === id ? { ...item, status } : item
      );

      setStore({ uid, items: next });
      try {
        await updateDoc(watchlistDocRef(uid), { items: next });
      } catch (writeError) {
        console.error(writeError);
        setStore({ uid, items: previous });
        setError("Could not move that title.");
      }
    },
    [uid]
  );

  const reorder = useCallback(
    async (targetId: number) => {
      if (!firebaseInitialized || uid === null) return;
      const sourceId = dragItem.current;
      if (sourceId === null || sourceId === targetId) return;

      const previous = watchlistRef.current;
      const sourceIndex = previous.findIndex((item) => item.id === sourceId);
      const targetIndex = previous.findIndex((item) => item.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return;

      const next = [...previous];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);

      setStore({ uid, items: next });
      try {
        await updateDoc(watchlistDocRef(uid), { items: next });
      } catch (writeError) {
        console.error(writeError);
        setStore({ uid, items: previous });
        setError("Could not reorder your watchlist.");
      }
    },
    [uid]
  );

  const onDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, id: number) => {
      dragItem.current = id;
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
  }, []);

  const onDropInColumn = useCallback(
    (event: React.DragEvent<HTMLElement>, status: WatchlistStatus) => {
      event.preventDefault();
      const id = dragItem.current;
      if (id !== null) {
        void setStatus(id, status);
        dragItem.current = null;
      }
    },
    [setStatus]
  );

  return useMemo(
    () => ({
      watchlist,
      ready,
      error,
      isInWatchlist,
      add,
      remove,
      setStatus,
      reorder,
      onDragStart,
      onDragOver,
      onDropInColumn,
    }),
    [
      watchlist,
      ready,
      error,
      isInWatchlist,
      add,
      remove,
      setStatus,
      reorder,
      onDragStart,
      onDragOver,
      onDropInColumn,
    ]
  );
}
