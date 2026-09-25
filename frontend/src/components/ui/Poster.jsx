import { TMDB_IMAGE_BASE_URL, PLACEHOLDER_IMAGE } from "../../constants";

/** Media poster with a placeholder fallback for missing or broken images. */
const Poster = ({ path, alt, className = "" }) => (
  <img
    src={path ? `${TMDB_IMAGE_BASE_URL}${path}` : PLACEHOLDER_IMAGE}
    alt={alt || "Media Poster"}
    loading="lazy"
    className={`object-cover ${className}`}
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = PLACEHOLDER_IMAGE;
    }}
  />
);

export default Poster;
