import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

/*
 * Inline message. Full 1px border + icon + words; never a coloured side stripe.
 * Use for things the user must read in place (a failed generation, a refund, a limit).
 * Use toast for confirmations that can disappear.
 */
const alertVariants = cva(
  "relative flex w-full items-start gap-3 rounded-md border p-4 text-sm",
  {
    variants: {
      variant: {
        info: "border-signal bg-signal-tint text-foreground [&>svg]:text-signal",
        success: "border-success text-foreground [&>svg]:text-success",
        warning: "border-warning text-foreground [&>svg]:text-warning",
        destructive:
          "border-destructive text-foreground [&>svg]:text-destructive",
      },
    },
    defaultVariants: { variant: "info" },
  }
)

const icons = {
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
  destructive: OctagonXIcon,
} as const

function Alert({
  className,
  variant = "info",
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  const Icon = icons[variant ?? "info"]
  return (
    <div
      data-slot="alert"
      role={variant === "destructive" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="grid gap-1">{children}</div>
    </div>
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="alert-title"
      className={cn("font-bold", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="alert-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
