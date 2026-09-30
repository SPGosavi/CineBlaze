/** Placeholder shelf shown while a trending row streams in. */
export function TrendingRowSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="w-1 h-5 bg-red-600 rounded-full" />
        <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
      </div>
      <div className="flex gap-4 overflow-hidden px-1">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="min-w-[140px] md:min-w-[160px] h-[240px] bg-white/5 rounded-xl animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

/** Placeholder grid shown while server-rendered search results stream in. */
export function MediaGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl bg-white/5 animate-pulse aspect-2/3"
        />
      ))}
    </div>
  );
}
