import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="grid gap-8" aria-busy="true" aria-label="Loading">
      <div className="grid gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-8 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
