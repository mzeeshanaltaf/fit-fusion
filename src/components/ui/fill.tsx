import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * Section fill: a full-bleed block where the surface IS the colour.
 *   vermilion  the brand red; the closing call to action, one hero statement per page
 *   ink        near-black; sample plan sheets, library numbers
 *   chalk      the default page colour; use to reset after a fill inside dark mode
 * Every primitive inside (buttons, inputs, badges, muted text, focus rings) re-themes itself
 * through the surface tokens, so children never hard-code colours.
 * Rule: at most one vermilion fill per screen height. Never stack two vermilion fills.
 */
type Tone = "vermilion" | "ink" | "chalk"

function Fill({
  tone = "vermilion",
  as: Comp = "section",
  contained = true,
  className,
  innerClassName,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "ref"> & {
  tone?: Tone
  as?: React.ElementType
  /** Wrap children in the standard 72rem content column. */
  contained?: boolean
  innerClassName?: string
}) {
  return (
    <Comp
      data-slot="fill"
      data-tone={tone}
      className={cn(`surface-${tone}`, "py-16 sm:py-24", className)}
      {...props}
    >
      {contained ? (
        <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", innerClassName)}>
          {children}
        </div>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Fill }
