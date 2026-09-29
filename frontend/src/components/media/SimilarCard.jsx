import { memo } from "react";
import { TMDB_IMAGE_BASE_URL, PLACEHOLDER_IMAGE } from "../../constants";

/** Compact poster card used in the "similar titles" row inside the details modal. */
const SimilarCard = ({ item, onClick }) => {
  const posterUrl = item.poster_path
    ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
    : PLACEHOLDER_IMAGE;
  const year =
    (item.release_date || item.first_air_date)?.split("-")[0] || "N/A";

  return (
    <div
      onClick={() => onClick(item)}
      className="min-w-[120px] w-[120px] bg-neutral-800 rounded-lg overflow-hidden shadow-md hover:scale-105 transition-transform cursor-pointer border border-neutral-700 flex-shrink-0 group"
    >
      <div className="relative h-40">
        <img
          src={posterUrl}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = PLACEHOLDER_IMAGE;
          }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
      </div>
      <div className="p-2 border-t border-neutral-700 space-y-1">
        <h4 className="text-xs font-bold text-gray-200 truncate">
          {item.title}
        </h4>
        <p className="text-[10px] text-orange-500 font-medium">{year}</p>

        <div className="flex gap-2">
          {item.imdb_rating && (
            <span className="text-[9px] font-bold text-yellow-500">
              IMDb {item.imdb_rating}
            </span>
          )}
          {item.rotten_tomatoes && (
            <span className="text-[9px] font-bold text-red-400">
              RT {item.rotten_tomatoes}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(SimilarCard);
