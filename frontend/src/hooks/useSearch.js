import { useState } from "react";
import api from "../services/api";

/** Owns the search box state and the AI-backed search request. */
export const useSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setSearchError(null);
    try {
      const res = await api.post("/find-movies", { description: searchQuery });
      setSearchResults(res.data.movies || []);
    } catch (err) {
      console.error(err);
      // axios rejects on non-2xx, so the status checks that used to sit on
      // the happy path now live here. No err.response means the request
      // never completed (network failure or the 15s timeout).
      if (err.response?.status === 429) {
        setSearchError(
          "Daily Limit Exceeded. Try again tomorrow! Or You can Try Searching Actual Title"
        );
      } else if (err.response) {
        setSearchError("Search failed. Please try again.");
      } else {
        setSearchError("Connection Error");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const clearResults = () => setSearchResults([]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError,
    handleSearch,
    clearResults,
  };
};
