import { Skeleton } from "@/components/ui/skeleton";

export default function CreditsLoading() {
  return (
    <div className="grid gap-10" aria-busy="true" aria-label="Loading your credits">
      <div className="grid gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-24 w-40" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
