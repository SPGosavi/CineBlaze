import { MediaGridSkeleton } from "@/components/ui/Skeleton";

export default function SearchLoading() {
  return (
    <div className="space-y-6 pt-4">
      <div className="h-6 w-48 bg-paper-3/60 rounded animate-pulse" />
      <MediaGridSkeleton count={10} />
    </div>
  );
}
