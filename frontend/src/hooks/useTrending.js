import { useState, useEffect, useMemo } from "react";
import api from "../services/api";

/** Tags results so downstream code can tell trending items from search hits. */
const withSource = (results) =>
  (results || []).map((item) => ({ ...item, __source: "trending" }));

/**
 * Loads the three trending shelves once on mount.
 *
 * Each request settles independently, so a slow or failing platform never
 * blocks the others from rendering.
 */
export const useTrending = () => {
  const [trendingAll, setTrendingAll] = useState([]);
  const [trendingNetflix, setTrendingNetflix] = useState([]);
  const [trendingPrime, setTrendingPrime] = useState([]);

  const [loadingTrending, setLoadingTrendingAll] = useState(true);
  const [loadingNetflix, setLoadingNetflix] = useState(true);
  const [loadingPrime, setLoadingPrime] = useState(true);

  useEffect(() => {
    api
      .get("/trending/all")
      .then((res) => setTrendingAll(withSource(res.data.results)))
      .catch(() => setTrendingAll([]))
      .finally(() => setLoadingTrendingAll(false));

    api
      .get("/trending/platform/netflix")
      .then((res) => setTrendingNetflix(withSource(res.data.results)))
      .catch(() => setTrendingNetflix([]))
      .finally(() => setLoadingNetflix(false));

    api
      .get("/trending/platform/prime")
      .then((res) => setTrendingPrime(withSource(res.data.results)))
      .catch(() => setTrendingPrime([]))
      .finally(() => setLoadingPrime(false));
  }, []);

  return useMemo(
    () => ({
      trendingAll,
      trendingNetflix,
      trendingPrime,
      loadingTrending,
      loadingNetflix,
      loadingPrime,
    }),
    [
      trendingAll,
      trendingNetflix,
      trendingPrime,
      loadingTrending,
      loadingNetflix,
      loadingPrime,
    ]
  );
};
