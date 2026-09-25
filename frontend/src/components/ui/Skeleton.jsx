/** Placeholder row shown while a trending shelf is loading. */
const TrendingSkeleton = () => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      <div className="w-1 h-5 bg-red-600 rounded-full"></div>
      <div className="h-5 w-40 bg-white/10 rounded animate-pulse"></div>
    </div>

    <div className="flex gap-4 overflow-hidden px-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="min-w-[140px] md:min-w-[160px] h-[240px] bg-white/5 rounded-xl animate-pulse"
        />
      ))}
    </div>
  </div>
);

export default TrendingSkeleton;
