import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * The data table: a ruled training sheet. Header gets a 2px ink rule, rows a 1px hairline.
 * Numbers go in <TableCell numeric>: right-aligned, tabular, lining figures.
 * The wrapper scrolls sideways on narrow screens instead of squashing columns.
 * density="compact" for plan sheets (sets / reps / rest), "comfortable" for history lists.
 * Server-component safe: density is plain CSS (data attribute), no context.
 */
function Table({
  className,
  density = "comfortable",
  ...props
}: React.ComponentProps<"table"> & { density?: "compact" | "comfortable" }) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
      tabIndex={0}
      role="region"
      aria-label={props["aria-label"] ?? "Table"}
    >
      <table
        data-slot="table"
        data-density={density}
        className={cn(
          "group/table w-full caption-bottom border-collapse text-sm",
          className
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("border-b-2 border-foreground", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t-2 border-foreground font-semibold", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors duration-(--dur-fast) hover:bg-accent/50 data-[state=selected]:bg-signal-tint",
        className
      )}
      {...props}
    />
  )
}

function TableHead({
  className,
  numeric,
  ...props
}: React.ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "t-label px-3 py-3 text-left align-bottom whitespace-nowrap text-muted-foreground group-data-[density=compact]/table:px-2 group-data-[density=compact]/table:py-2",
        numeric && "t-num text-right",
        className
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  numeric,
  ...props
}: React.ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-3.5 align-middle group-data-[density=compact]/table:px-2 group-data-[density=compact]/table:py-2",
        numeric && "t-num text-right font-semibold whitespace-nowrap",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-3 text-left text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
