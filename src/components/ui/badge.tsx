import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/*
 * A tag, not a pill: rectangular, uppercase label type. Status is never colour alone,
 * so pair success/warning/destructive with an icon or a word that says what it is.
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border border-transparent px-2 py-0.5 text-[0.6875rem] leading-4 font-bold uppercase tracking-wider w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors duration-(--dur-fast) ease-out-quart overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background [a&]:hover:bg-foreground/85",
        signal: "bg-primary text-primary-foreground [a&]:hover:bg-primary-hover",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-accent",
        outline:
          "border-foreground text-foreground [a&]:hover:bg-accent",
        destructive:
          "bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90",
        success: "border-success text-success",
        warning: "border-warning text-warning",
        ghost: "text-muted-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-signal underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
