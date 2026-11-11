import * as React from "react"
import { OctagonXIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

/*
 * Field = label + control + hint + error, stacked.
 *   <Field>
 *     <FieldLabel htmlFor="age">Age</FieldLabel>
 *     <Input id="age" aria-describedby="age-hint age-error" aria-invalid={!!error} />
 *     <FieldHint id="age-hint">15 to 100.</FieldHint>
 *     <FieldError id="age-error">{error}</FieldError>
 *   </Field>
 * Errors say what to do ("Enter an age between 15 and 100"), carry an icon, and are never colour-only.
 */
function Field({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("grid gap-1.5", className)}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn("leading-snug", className)}
      {...props}
    />
  )
}

function FieldHint({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-hint"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function FieldError({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  if (!children) return null
  return (
    <p
      data-slot="field-error"
      aria-live="polite"
      className={cn(
        "flex items-start gap-1.5 text-sm font-semibold text-destructive",
        className
      )}
      {...props}
    >
      <OctagonXIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export { Field, FieldLabel, FieldHint, FieldError }
