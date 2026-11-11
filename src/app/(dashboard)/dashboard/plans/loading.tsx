import { Skeleton } from "@/components/ui/skeleton";

export default function PlansLoading() {
  return (
    <div className="grid gap-8" aria-busy="true" aria-label="Loading your plans">
      <div className="flex items-end justify-between gap-4">
        <div className="grid gap-3">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="hidden h-12 w-36 sm:block" />
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
