import { Skeleton } from "@/components/ui/skeleton";

export default function GenerateLoading() {
  return (
    <div className="grid gap-8" aria-busy="true" aria-label="Loading the form">
      <div className="grid gap-3">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid max-w-3xl gap-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
