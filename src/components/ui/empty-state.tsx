import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * An empty state teaches the interface: say what belongs here, why it is empty,
 * and give the one action that fills it. Never just "Nothing here".
 *   <EmptyState title="No plans yet" description="A plan takes about 30 seconds and costs 1 credit.">
 *     <Button asChild><Link href="/dashboard/generate">Generate your first plan</Link></Button>
 *   </EmptyState>
 */
function EmptyState({
  icon,
  title,
  description,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-start gap-3 rounded-md border border-dashed border-input p-6 sm:p-8",
        className
      )}
      {...props}
    >
      {icon ? (
        <div aria-hidden className="text-foreground [&_svg]:size-7">
          {icon}
        </div>
      ) : null}
      <h3 data-slot="empty-state-title" className="t-heading">
        {title}
      </h3>
      {description ? (
        <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="mt-1 flex flex-wrap gap-2">{children}</div> : null}
    </div>
  )
}

export { EmptyState }
