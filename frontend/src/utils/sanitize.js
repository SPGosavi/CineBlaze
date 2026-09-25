/**
 * Normalises a media item coming from the API or Firestore so components can
 * rely on every field being present and correctly typed.
 *
 * The backend already guarantees most of these shapes, but watchlist entries
 * are read straight out of Firestore where older documents may predate the
 * current shape.
 */
export const sanitizeItem = (item) => {
  if (!item) return null;
  return {
    ...item,
    id: item.id,
    genres: Array.isArray(item.genres) ? item.genres : [],
    cast: Array.isArray(item.cast) ? item.cast : [],
    providers: Array.isArray(item.providers) ? item.providers : [],
    director: item.director || "Unknown",
    release_date: item.release_date || item.first_air_date || "",
    media_type: item.media_type || "movie",
    title: item.title || item.name || "Untitled",
    status: item.status || "want",
    poster_path: item.poster_path || null,
    vote_average: typeof item.vote_average === "number" ? item.vote_average : 0,
    imdb_rating: item.imdb_rating || null,
    rotten_tomatoes: item.rotten_tomatoes || null,
    addedAt: item.addedAt || 0,
  };
};
