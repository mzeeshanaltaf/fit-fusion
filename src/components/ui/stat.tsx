import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * A figure with a label: "SETS 4", "KCAL 2,050", "WEEKS 3". The number is the hero:
 * condensed, heavy, tabular. Use inside data (a plan header, a week strip, a credits balance),
 * not as a row of decorative vanity metrics.
 */
const sizes = {
  sm: "2rem",
  md: "3rem",
  lg: "4.5rem",
  xl: "clamp(4.5rem, 2rem + 12vw, 9rem)",
} as const

function Stat({
  label,
  value,
  unit,
  hint,
  size = "md",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  label: React.ReactNode
  value: React.ReactNode
  /** Short unit shown beside the figure in normal width: "kg", "kcal", "wk". */
  unit?: React.ReactNode
  /** One quiet line under the figure. */
  hint?: React.ReactNode
  size?: keyof typeof sizes
}) {
  return (
    <div
      data-slot="stat"
      className={cn("flex min-w-0 flex-col gap-1.5", className)}
      style={{ "--stat-size": sizes[size] } as React.CSSProperties}
      {...props}
    >
      <p data-slot="stat-label" className="t-label text-muted-foreground">
        {label}
      </p>
      <p data-slot="stat-value" className="t-stat flex items-baseline gap-1.5">
        <span>{value}</span>
        {unit ? (
          <span
            data-slot="stat-unit"
            className="wdth-100 text-[0.32em] font-semibold tracking-normal text-muted-foreground"
          >
            {unit}
          </span>
        ) : null}
      </p>
      {hint ? (
        <p data-slot="stat-hint" className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export { Stat }
