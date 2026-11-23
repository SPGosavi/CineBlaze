import { TrendingRowSkeleton } from "@/components/ui/Skeleton";

export default function MediaDetailLoading() {
  return (
    <div className="space-y-12">
      <div className="relative min-h-[50vh] flex flex-col md:flex-row gap-8 items-start pt-6">
        <div className="w-full md:w-[320px] shrink-0 aspect-2/3 rounded-card bg-paper-2 border border-rule animate-pulse" />
        <div className="flex-1 space-y-4 w-full">
          <div className="h-10 w-3/4 bg-paper-3/60 rounded animate-pulse" />
          <div className="h-5 w-1/3 bg-paper-3/60 rounded animate-pulse" />
          <div className="flex gap-2 pt-2">
            <div className="h-8 w-20 bg-paper-3/60 rounded-full animate-pulse" />
            <div className="h-8 w-20 bg-paper-3/60 rounded-full animate-pulse" />
            <div className="h-8 w-20 bg-paper-3/60 rounded-full animate-pulse" />
          </div>
          <div className="space-y-2 pt-4">
            <div className="h-4 w-full bg-paper-3/60 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-paper-3/60 rounded animate-pulse" />
            <div className="h-4 w-4/6 bg-paper-3/60 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <TrendingRowSkeleton />
    </div>
  );
}
