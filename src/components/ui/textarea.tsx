import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-base text-foreground transition-[color,border-color] duration-(--dur-fast) ease-out-quart placeholder:text-muted-foreground hover:border-foreground focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-2 aria-invalid:border-destructive aria-invalid:hover:border-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
