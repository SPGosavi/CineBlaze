import { useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { firebaseInitialized } from "../services/firebase";
import { sanitizeItem } from "../utils/sanitize";
import { useWatchlistContext } from "../contexts/WatchlistContext";
import { useModalContext } from "../contexts/ModalContext";
import GenreFilter from "../components/watchlist/GenreFilter";
import KanbanColumn from "../components/watchlist/KanbanColumn";

const WatchlistPage = () => {
  const { watchlist, onDrop, onDragOver, onDragStart, handleReorder } =
    useWatchlistContext();
  const { openMedia } = useModalContext();

  const [watchlistType, setWatchlistType] = useState("movie");
  const [filterGenre, setFilterGenre] = useState("All");

  const safeWatchlist = Array.isArray(watchlist)
    ? watchlist.filter((item) => item && item.id).map((i) => sanitizeItem(i))
    : [];

  // Filter out duplicates (just in case DB has them)
  const uniqueWatchlist = Array.from(
    new Map(safeWatchlist.map((item) => [item.id, item])).values()
  );

  const typeFiltered = uniqueWatchlist.filter(
    (i) =>
      i &&
      (watchlistType === "movie"
        ? i.media_type === "movie"
        : i.media_type === "tv")
  );

  const allGenres = useMemo(() => {
    const genres = new Set();
    typeFiltered.forEach((item) => {
      if (Array.isArray(item.genres)) item.genres.forEach((g) => genres.add(g));
    });
    return ["All", ...Array.from(genres).sort()];
  }, [typeFiltered]);

  // Must come after every hook call, otherwise the hook order changes
  // between renders and React throws.
  if (!firebaseInitialized)
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
        <AlertTriangle size={48} className="mb-4 text-orange-500" />
        <h2 className="text-xl font-bold text-white mb-2">
          Feature Unavailable
        </h2>
        <p>Add Firebase config to use Watchlist.</p>
      </div>
    );

  const finalFiltered =
    filterGenre === "All"
      ? typeFiltered
      : typeFiltered.filter(
          (i) => Array.isArray(i.genres) && i.genres.includes(filterGenre)
        );

  const want = finalFiltered.filter((i) => i.status === "want");
  const watching = finalFiltered.filter((i) => i.status === "watching");
  const watched = finalFiltered.filter((i) => i.status === "watched");

  return (
    <div className="h-full flex flex-col animate-fade-in pb-20 md:pb-0 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-white tracking-tight">
            My Watchlist
          </h1>
          <div className="flex items-center gap-4">
            <GenreFilter
              genres={allGenres}
              selected={filterGenre}
              onChange={setFilterGenre}
            />
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              {finalFiltered.length} Titles
            </span>
          </div>
        </div>

        <div className="bg-black p-1.5 rounded-xl flex gap-1 w-full md:w-auto border border-neutral-800 shadow-inner">
          <button
            onClick={() => {
              setWatchlistType("movie");
              setFilterGenre("All");
            }}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${watchlistType === "movie" ? "bg-red-600 text-white shadow-lg shadow-red-900/30" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
          >
            Movies
          </button>
          <button
            onClick={() => {
              setWatchlistType("tv");
              setFilterGenre("All");
            }}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${watchlistType === "tv" ? "bg-orange-600 text-white shadow-lg shadow-orange-900/30" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
          >
            TV Series
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {watchlistType === "tv" && (
          <KanbanColumn
            title="Watching Now"
            status="watching"
            items={watching}
            onDropColumn={onDrop}
            onDragOver={onDragOver}
            onDragStart={onDragStart}
            onExpand={openMedia}
            onDropItem={handleReorder}
          />
        )}
        <KanbanColumn
          title="Want to Watch"
          status="want"
          items={want}
          onDropColumn={onDrop}
          onDragOver={onDragOver}
          onDragStart={onDragStart}
          onExpand={openMedia}
          onDropItem={handleReorder}
        />
        <KanbanColumn
          title="Watched"
          status="watched"
          items={watched}
          onDropColumn={onDrop}
          onDragOver={onDragOver}
          onDragStart={onDragStart}
          onExpand={openMedia}
          onDropItem={handleReorder}
        />
      </div>
    </div>
  );
};

export default WatchlistPage;
