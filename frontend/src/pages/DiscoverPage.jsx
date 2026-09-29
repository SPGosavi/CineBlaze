import { Search, AlertTriangle, Zap } from "lucide-react";
import { useTrending } from "../hooks/useTrending";
import { useSearchContext } from "../contexts/SearchContext";
import { useWatchlistContext } from "../contexts/WatchlistContext";
import { useModalContext } from "../contexts/ModalContext";
import TrendingSkeleton from "../components/ui/Skeleton";
import MediaCard from "../components/media/MediaCard";
import TrendingRow from "../components/trending/TrendingRow";

const DiscoverPage = () => {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError,
    handleSearch,
    clearResults,
  } = useSearchContext();

  const {
    trendingAll,
    trendingNetflix,
    trendingPrime,
    loadingTrending,
    loadingNetflix,
    loadingPrime,
  } = useTrending();

  const { addToWatchlist } = useWatchlistContext();
  const { openMedia } = useModalContext();

  const onAddToWatchlist = (item) => addToWatchlist(item, "want");

  return (
    <div className="space-y-10 animate-fade-in pb-24 md:pb-10">
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 border border-white/5 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/80 via-orange-900/60 to-black z-0"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-red-600/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">
            Ignite your next{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
              obsession.
            </span>
          </h1>
          <p className="text-gray-200 text-sm md:text-lg max-w-xl mx-auto font-medium opacity-90">
            Describe the plot, the vibe, or the scene stuck in your head. Our AI
            will handle the rest.
          </p>

          <form
            onSubmit={handleSearch}
            className="relative max-w-2xl mx-auto group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
            <div className="relative flex items-center">
              <Search
                className="absolute left-4 text-gray-400 group-focus-within:text-red-400 transition-colors"
                size={20}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. A noir detective movie set in 2049..."
                className="w-full bg-neutral-900/90 text-white p-4 pl-12 pr-24 rounded-2xl border border-white/10 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all outline-none shadow-xl text-base placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white px-5 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  "Find"
                )}
              </button>
            </div>
          </form>
          {searchError && (
            <div
              className={`px-4 py-3 rounded-xl text-sm font-medium inline-flex items-center gap-3 animate-fade-in shadow-lg border ${
                searchError.includes("Limit")
                  ? "bg-orange-500/10 border-orange-500/50 text-orange-400"
                  : "bg-red-500/10 border-red-500/50 text-red-400"
              }`}
            >
              <AlertTriangle size={18} />
              {searchError}
            </div>
          )}
        </div>
      </div>

      {(isSearching || searchResults.length > 0) && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="text-orange-500 fill-orange-500" size={20} />{" "}
              Results
            </h2>
            <button
              onClick={clearResults}
              className="text-sm text-gray-400 hover:text-white px-3 py-1 rounded-full hover:bg-white/10 transition-colors"
            >
              Clear Results
            </button>
          </div>
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
              <p className="text-gray-500 animate-pulse font-medium">
                Scanning the archives...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {searchResults.map((m) => (
                <MediaCard
                  key={m.id}
                  item={m}
                  onAddToWatchlist={onAddToWatchlist}
                  onExpand={openMedia}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {searchResults.length === 0 && !isSearching && (
        <div className="space-y-10">
          {loadingTrending ? (
            <TrendingSkeleton />
          ) : (
            <TrendingRow
              title="Trending Now"
              items={trendingAll}
              onAdd={onAddToWatchlist}
              onExpand={openMedia}
            />
          )}

          {loadingNetflix ? (
            <TrendingSkeleton />
          ) : (
            <TrendingRow
              title="Popular on Netflix"
              items={trendingNetflix}
              onAdd={onAddToWatchlist}
              onExpand={openMedia}
            />
          )}

          {loadingPrime ? (
            <TrendingSkeleton />
          ) : (
            <TrendingRow
              title="Popular on Prime Video"
              items={trendingPrime}
              onAdd={onAddToWatchlist}
              onExpand={openMedia}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default DiscoverPage;
