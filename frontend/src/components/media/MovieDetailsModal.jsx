import { useState, useEffect } from "react";
import { X, Trash2, Plus, Zap, Film, MonitorPlay } from "lucide-react";
import api from "../../services/api";
import { TMDB_LOGO_BASE_URL } from "../../constants";
import { sanitizeItem } from "../../utils/sanitize";
import Poster from "../ui/Poster";
import HorizontalScrollContainer from "../ui/HorizontalScroll";
import SimilarCard from "./SimilarCard";

/**
 * Full-screen details view for a movie or series.
 *
 * Opens with whatever data the caller already has, then backfills cast and
 * streaming providers from the API when those are missing.
 */
const MovieDetailsModal = ({
  item,
  onClose,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  isInWatchlist,
  onExpand,
}) => {
  const [detailedItem, setDetailedItem] = useState(item);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  // Tracked but not yet surfaced in the UI -- no loading indicator is
  // rendered for the details fetch, so only the setter is bound.
  const [, setLoadingDetails] = useState(false);

  // Initialize
  useEffect(() => {
    setSimilarMovies([]);
    setShowSimilar(false);

    const needsFetch =
      !item.cast ||
      item.cast.length === 0 ||
      !item.providers ||
      item.providers.length === 0;

    if (needsFetch) {
      setLoadingDetails(true);
      api
        .post("/media-details", {
          id: item.id,
          title: item.title || item.name,
          year: (item.release_date || item.first_air_date)?.split("-")[0],
          media_type: item.media_type || "movie",
        })
        .then(({ data }) => {
          if (data && data.id) {
            // Merge and sanitize
            const newItem = { ...item, ...data };
            setDetailedItem(sanitizeItem(newItem));
          }
          setLoadingDetails(false);
        })
        .catch(() => setLoadingDetails(false));
    } else {
      setDetailedItem(sanitizeItem(item));
    }
  }, [item.id]);

  useEffect(() => {
    if (item?.id && !item.providers) {
      api
        .post("/media-extras", {
          id: item.id,
          media_type: item.media_type,
        })
        .then((res) => {
          setDetailedItem((prev) => ({
            ...prev,
            providers: res.data.providers,
          }));
        });
    }
  }, [item]);

  if (!detailedItem) return null;

  // Use detailedItem for rendering
  const safeItem = sanitizeItem(detailedItem);
  const isTv = safeItem.media_type === "tv";
  const year = safeItem.release_date.split("-")[0] || "N/A";
  const imdbRating =
    safeItem.imdb_rating && safeItem.imdb_rating !== "N/A"
      ? safeItem.imdb_rating
      : null;
  const rtRating =
    safeItem.rotten_tomatoes && safeItem.rotten_tomatoes !== "N/A"
      ? safeItem.rotten_tomatoes
      : null;

  const handleFetchSimilar = async () => {
    if (showSimilar) {
      setShowSimilar(false);
      return;
    }
    setShowSimilar(true);
    if (similarMovies.length > 0) return;
    setLoadingSimilar(true);
    try {
      const { data } = await api.post("/get-similar", {
        title: safeItem.title,
        media_type: safeItem.media_type,
        year: year,
        genres: safeItem.genres || [],
        overview: safeItem.overview || "",
        cast: safeItem.cast || [],
        director: safeItem.director || "Unknown",
      });
      setSimilarMovies(data.similar || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSimilar(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 w-full max-w-5xl h-[90vh] md:h-auto md:max-h-[90vh] rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl border border-neutral-700 flex flex-col md:flex-row relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-red-600 rounded-full text-white transition-colors border border-white/10"
        >
          <X size={20} />
        </button>

        <div className="md:w-1/3 h-48 md:h-auto relative flex-shrink-0">
          <Poster
            path={safeItem.poster_path}
            alt={safeItem.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-neutral-900"></div>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`text-xs font-black px-2 py-0.5 rounded text-white uppercase tracking-wider ${isTv ? "bg-orange-600" : "bg-red-600"}`}
              >
                {isTv ? "Series" : "Movie"}
              </span>
              <span className="text-gray-400 font-medium font-mono">
                {year}
              </span>
              {imdbRating && (
                <span className="text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                  IMDb {imdbRating}
                </span>
              )}
              {rtRating && (
                <span className="text-red-400 font-bold bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">
                  RT {rtRating}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <h2 className="text-2xl md:text-4xl font-black text-white leading-tight tracking-tight">
                {safeItem.title}
              </h2>

              {safeItem.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end">
                  {safeItem.genres.slice(0, 3).map((genre, index) => (
                    <span
                      key={index}
                      className="text-xs uppercase tracking-wider font-bold text-orange-400 border border-orange-500/30 px-2 py-1 rounded-md bg-orange-500/10"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {safeItem.director && safeItem.director !== "Unknown" && (
              <p className="text-gray-400 text-sm">
                Directed by{" "}
                <span className="text-white font-semibold">
                  {safeItem.director}
                </span>
              </p>
            )}
          </div>

          {safeItem.cast.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">
                Starring
              </h3>
              <div className="flex flex-wrap gap-2">
                {safeItem.cast.map((actor, idx) => (
                  <span
                    key={idx}
                    className="bg-neutral-800 text-gray-300 px-3 py-1 rounded-full text-sm border border-neutral-700 hover:border-gray-500 transition-colors cursor-default"
                  >
                    {actor}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">
              Synopsis
            </h3>
            <p className="text-gray-300 leading-relaxed text-sm md:text-base border-l-2 border-red-600 pl-4">
              {safeItem.overview || "No plot description available."}
            </p>
          </div>

          {safeItem.providers.length > 0 && (
            <div className="mb-6 border-t border-neutral-800 pt-4">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest flex items-center gap-2">
                <MonitorPlay size={14} /> Streaming On
              </h3>
              <div className="flex flex-wrap gap-3">
                {safeItem.providers.map((provider, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-neutral-800 p-2 rounded-lg border border-neutral-700 hover:border-neutral-500 transition-colors"
                    title={provider.name}
                  >
                    <img
                      src={`${TMDB_LOGO_BASE_URL}${provider.logo}`}
                      alt={provider.name}
                      loading="lazy"
                      className="w-6 h-6 rounded-md"
                    />
                    <span className="text-xs text-gray-300 font-medium">
                      {provider.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-6 border-t border-neutral-800">
            {isInWatchlist ? (
              <button
                onClick={() => {
                  onRemoveFromWatchlist(safeItem.id);
                  onClose();
                }}
                className="flex-1 bg-red-900/20 border border-red-500/50 text-red-500 font-bold py-3 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 group"
              >
                <Trash2
                  size={20}
                  className="group-hover:scale-110 transition-transform"
                />{" "}
                Remove from List
              </button>
            ) : (
              <button
                onClick={() => {
                  onAddToWatchlist(safeItem);
                  onClose();
                }}
                className="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/10 active:scale-95"
              >
                <Plus size={20} /> Add to Watchlist
              </button>
            )}
            <button
              onClick={handleFetchSimilar}
              className={`flex-1 font-bold py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${showSimilar ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-900/20" : "border-neutral-600 text-gray-300 hover:bg-neutral-800 hover:border-gray-400"}`}
            >
              <Zap size={18} className={showSimilar ? "animate-pulse" : ""} />{" "}
              {showSimilar ? "Hide Similar" : "Find Similar"}
            </button>
          </div>

          {showSimilar && (
            <div className="mt-6 animate-fade-in pb-10 md:pb-0 border-t border-neutral-800 pt-4">
              <h3 className="text-sm font-bold text-orange-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Film size={14} /> You might also like
              </h3>
              {loadingSimilar ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
                </div>
              ) : similarMovies.length > 0 ? (
                <HorizontalScrollContainer>
                  {similarMovies.map((sim) => (
                    <SimilarCard key={sim.id} item={sim} onClick={onExpand} />
                  ))}
                </HorizontalScrollContainer>
              ) : (
                <p className="text-gray-500 text-sm">
                  No similar titles found.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieDetailsModal;
