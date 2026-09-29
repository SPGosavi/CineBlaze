import { useState, useEffect, useRef } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";
import { db, firebaseInitialized } from "../services/firebase";

/**
 * Resolves the Firestore document holding a user's watchlist.
 *
 * Previously duplicated at all five call sites; kept in one place so the
 * path can never drift between read and write.
 */
const watchlistDocRef = (uid) =>
  doc(db, "artifacts", "default-app-id", "users", uid, "data", "watchlist");

/**
 * Owns the watchlist: a live Firestore subscription plus the mutations.
 *
 * Status changes and reordering write optimistically to local state before
 * hitting Firestore, so the drag interaction stays responsive. The snapshot
 * listener then reconciles with the server copy.
 */
export const useWatchlist = (user) => {
  const [watchlist, setWatchlist] = useState([]);
  const dragItem = useRef(null);

  useEffect(() => {
    if (!firebaseInitialized || !user) return;

    const userRef = watchlistDocRef(user.uid);

    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setWatchlist(Array.isArray(data.items) ? data.items : []);
      } else {
        setWatchlist([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const addToWatchlist = async (item, status = "want") => {
    if (!firebaseInitialized || !user) return;
    const newItem = {
      id: item.id,
      title: item.title || item.name,
      poster_path: item.poster_path,
      release_date: item.release_date || item.first_air_date,
      media_type: item.media_type,
      status: status,
      genres: item.genres || [],
      director: item.director || "Unknown",
      cast: item.cast || [],
      overview: item.overview || "",
      vote_average: item.vote_average || 0,
      imdb_rating: item.imdb_rating || null,
      rotten_tomatoes: item.rotten_tomatoes || null,
      providers: item.providers || [],
      addedAt: Date.now(),
    };
    if (watchlist.some((i) => i.id === newItem.id)) return;
    const userRef = watchlistDocRef(user.uid);
    try {
      await setDoc(userRef, { items: arrayUnion(newItem) }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const removeFromWatchlist = async (itemId) => {
    if (!firebaseInitialized || !user) return;
    const item = watchlist.find((i) => i.id === itemId);
    if (!item) return;
    const userRef = watchlistDocRef(user.uid);
    await updateDoc(userRef, { items: arrayRemove(item) });
  };

  const updateWatchlistStatus = async (id, status) => {
    if (!firebaseInitialized || !user) return;
    const updated = watchlist.map((i) => (i.id === id ? { ...i, status } : i));
    setWatchlist(updated);
    const userRef = watchlistDocRef(user.uid);
    await updateDoc(userRef, { items: updated });
  };

  const handleReorder = async (targetId) => {
    if (!firebaseInitialized || !user) return;
    const sourceId = dragItem.current;
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = watchlist.findIndex((i) => i.id === sourceId);
    const targetIndex = watchlist.findIndex((i) => i.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newList = [...watchlist];
    const [movedItem] = newList.splice(sourceIndex, 1);
    newList.splice(targetIndex, 0, movedItem);

    setWatchlist(newList);

    const userRef = watchlistDocRef(user.uid);
    await updateDoc(userRef, { items: newList });
  };

  const onDragStart = (e, id) => {
    dragItem.current = id;
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = (e, status) => {
    e.preventDefault();
    const id = dragItem.current;
    if (id) {
      updateWatchlistStatus(id, status);
      dragItem.current = null;
    }
  };

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistStatus,
    handleReorder,
    onDragStart,
    onDragOver,
    onDrop,
  };
};
