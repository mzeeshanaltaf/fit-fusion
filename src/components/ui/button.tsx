import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2Icon } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/*
 * Buttons never use the condensed display width. Sentence case, semibold, 2px radius.
 * `default` is the one vermilion action per view. `inverse` flips with the surface
 * (ink on chalk, chalk on ink or vermilion). On a .surface-vermilion section `default`
 * becomes an ink button automatically.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-[650] cursor-pointer select-none transition-[color,background-color,border-color,transform] duration-(--dur-fast) ease-out-quart active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-busy:pointer-events-none aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover",
        inverse: "bg-foreground text-background hover:bg-foreground/85",
        outline:
          "border border-foreground bg-transparent text-foreground hover:bg-accent",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-signal underline decoration-1 underline-offset-4 hover:decoration-2 active:translate-y-0",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-7 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 px-6 text-base has-[>svg]:px-5",
        xl: "h-14 px-8 text-base font-bold uppercase tracking-wider has-[>svg]:px-6",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  onClick,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows a spinner, sets aria-busy and blocks clicks. Ignored with asChild. */
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  const isLoading = loading && !asChild

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={isLoading || undefined}
      aria-disabled={isLoading || undefined}
      disabled={disabled}
      onClick={isLoading ? (e) => e.preventDefault() : onClick}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {isLoading && <Loader2Icon className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
