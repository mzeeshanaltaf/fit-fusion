"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"
import { Toggle as TogglePrimitive, ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/*
 * Chips are selectable choices: diet, equipment, goal, days per week.
 * Selected = ink fill + check mark, so selection never relies on colour alone.
 * Use <Chip> for an independent on/off, <ChipGroup type="single|multiple"> for sets.
 * Rendered as Radix Toggle, so aria-pressed, Space/Enter and roving focus come built in.
 */
const chipClass =
  "group/chip inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-input bg-card px-3.5 text-sm font-semibold whitespace-nowrap text-foreground select-none cursor-pointer transition-colors duration-(--dur-fast) ease-out-quart hover:border-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background [&_svg]:size-4"

function ChipCheck() {
  return (
    <CheckIcon
      aria-hidden
      className="hidden group-data-[state=on]/chip:block"
      strokeWidth={3}
    />
  )
}

function Chip({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root>) {
  return (
    <TogglePrimitive.Root
      data-slot="chip"
      className={cn(chipClass, className)}
      {...props}
    >
      <ChipCheck />
      {children}
    </TogglePrimitive.Root>
  )
}

function ChipGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="chip-group"
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    />
  )
}

function ChipGroupItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="chip-group-item"
      className={cn(chipClass, className)}
      {...props}
    >
      <ChipCheck />
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { Chip, ChipGroup, ChipGroupItem }
