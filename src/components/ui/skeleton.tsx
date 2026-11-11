import { cn } from "@/lib/utils"

/* Loading placeholder. Pulses gently; static under prefers-reduced-motion (global rule). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  )
}

export { Skeleton }
