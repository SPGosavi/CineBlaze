import { Plus } from "lucide-react";
import Poster from "../ui/Poster";
import HorizontalScrollContainer from "../ui/HorizontalScroll";
import { sanitizeItem } from "../../utils/sanitize";

/** A titled, horizontally scrollable shelf of trending titles. */
const TrendingRow = ({ title, items, onAdd, onExpand }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      <div className="w-1 h-5 bg-red-600 rounded-full"></div>
      <h2 className="text-lg font-bold text-gray-200">{title}</h2>
    </div>
    <HorizontalScrollContainer>
      {items.map((item) => {
        const safeItem = sanitizeItem(item);
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
            key={item.id}
            className="min-w-[140px] md:min-w-[160px] w-[140px] md:w-[160px] flex-shrink-0 relative group cursor-pointer"
            onClick={() => onExpand(safeItem)}
          >
            <div className="relative aspect-[2/3] mb-2 rounded-lg overflow-hidden shadow-lg">
              <Poster
                path={safeItem.poster_path}
                alt={safeItem.title}
                className="w-full h-full hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(safeItem);
                  }}
                  className="bg-red-600 p-2 rounded-full text-white hover:bg-red-500 transform hover:scale-110 transition-all shadow-xl"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
            <p className="text-sm font-bold text-gray-300 truncate group-hover:text-red-500 transition-colors">
              {safeItem.title}
            </p>
            <div className="flex gap-2 mt-1 h-4">
              {imdbRating && (
                <span className="text-[9px] font-bold text-yellow-500 border border-yellow-500/20 px-1 rounded bg-yellow-500/5">
                  IMDb {imdbRating}
                </span>
              )}
              {rtRating && (
                <span className="text-[9px] font-bold text-red-400 border border-red-400/20 px-1 rounded bg-red-400/5">
                  RT {rtRating}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </HorizontalScrollContainer>
  </div>
);

export default TrendingRow;
