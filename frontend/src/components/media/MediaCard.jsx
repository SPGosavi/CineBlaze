import { memo } from "react";
import { Plus } from "lucide-react";
import Poster from "../ui/Poster";
import { sanitizeItem } from "../../utils/sanitize";

/** Grid card for a search result, with quick add-to-watchlist. */
const MediaCard = ({ item, onAddToWatchlist, onExpand }) => {
  if (!item) return null;
  const safeItem = sanitizeItem(item);
  const year = safeItem.release_date.split("-")[0] || "N/A";
  const isTv = safeItem.media_type === "tv";
  const typeName = isTv ? "TV" : "MOVIE";
  const typeBadgeColor = isTv ? "bg-orange-600" : "bg-red-600";

  const imdbRating =
    safeItem.imdb_rating && safeItem.imdb_rating !== "N/A"
      ? safeItem.imdb_rating
      : null;
  const rtRating =
    safeItem.rotten_tomatoes && safeItem.rotten_tomatoes !== "N/A"
      ? safeItem.rotten_tomatoes
      : null;

  return (
    <div
      className="bg-neutral-800 rounded-xl overflow-hidden shadow-lg border border-neutral-700/50 active:scale-95 md:hover:scale-[1.02] hover:border-red-500/30 transition-all duration-200 flex flex-col h-full cursor-pointer group"
      onClick={() => onExpand(safeItem)}
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        <Poster
          path={safeItem.poster_path}
          alt={safeItem.title}
          className="w-full h-full transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
        <span
          className={`absolute top-2 left-2 text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm text-white tracking-wider ${typeBadgeColor}`}
        >
          {typeName}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToWatchlist(safeItem);
          }}
          className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-500 rounded-full text-white transition-all shadow-lg shadow-red-900/20 md:opacity-0 group-hover:opacity-100 opacity-100 transform translate-y-0 group-hover:translate-y-0"
          title="Add to Watchlist"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>
      <div className="p-3 flex flex-col flex-grow bg-neutral-800 relative z-10">
        <h3
          className="font-bold text-gray-100 leading-tight mb-1 line-clamp-1 group-hover:text-red-400 transition-colors"
          title={safeItem.title}
        >
          {safeItem.title}
        </h3>
        <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
          <span className="font-mono text-gray-500">{year}</span>
          {safeItem.director && safeItem.director !== "Unknown" && (
            <span
              className="truncate max-w-[80px] md:max-w-[100px] text-gray-500"
              title={safeItem.director}
            >
              {safeItem.director}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mb-2 min-h-[20px]">
          {safeItem.genres.slice(0, 2).map((g, i) => (
            <span
              key={i}
              className="text-[9px] uppercase tracking-wider font-semibold text-gray-400 border border-neutral-600 px-1.5 py-0.5 rounded-sm"
            >
              {g}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-2 flex gap-2 border-t border-neutral-700/50">
          {imdbRating ? (
            <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
              IMDb {imdbRating}
            </span>
          ) : (
            <span className="text-[10px] text-gray-600">No Rating</span>
          )}

          {rtRating && (
            <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20">
              RT {rtRating}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(MediaCard);
