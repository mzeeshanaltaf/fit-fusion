"use client";

import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import type { DayNutrition, Meal } from "@/lib/types";
import { EditConfirm } from "./edit-confirm";

export interface NutritionDayProps {
  day: number;
  data: DayNutrition;
  editsLeft: number;
  editLimit: number;
  editBusy: boolean;
  regenerating: boolean;
  confirming: boolean;
  onAskRegenerate: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

interface Row {
  label: string;
  meal: Meal;
}

function sum(rows: Row[], key: "calories" | "protein_g" | "carbs_g" | "fat_g"): number {
  return rows.reduce((total, r) => total + (Number(r.meal[key]) || 0), 0);
}

/** One meal day as a compact table with day totals. */
export function NutritionDay({
  day,
  data,
  editsLeft,
  editLimit,
  editBusy,
  regenerating,
  confirming,
  onAskRegenerate,
  onCancel,
  onConfirm,
}: NutritionDayProps) {
  const rows: Row[] = [
    { label: "Breakfast", meal: data.breakfast },
    { label: "Lunch", meal: data.lunch },
    { label: "Dinner", meal: data.dinner },
    ...data.snacks.map((meal, i) => ({
      label: data.snacks.length > 1 ? `Snack ${i + 1}` : "Snack",
      meal,
    })),
  ];

  return (
    <section aria-labelledby={`day-${day}`} className="grid gap-4 border-t-2 border-foreground pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={`day-${day}`} className="t-heading">
          Day {day}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onAskRegenerate}
          disabled={editBusy || editsLeft <= 0 || confirming}
          title={editsLeft <= 0 ? "No edits left on this plan" : undefined}
        >
          <RefreshCwIcon aria-hidden />
          Regenerate day
          <span className="sr-only"> {day}</span>
        </Button>
      </div>

      {confirming && (
        <EditConfirm
          description={`Write new meals for day ${day}. Your calorie and macro targets stay the same.`}
          editsLeft={editsLeft}
          editLimit={editLimit}
          seconds="25 seconds"
          confirmLabel="Regenerate day"
          busy={regenerating}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}

      <Table density="compact" aria-label={`Meals for day ${day}`} className="min-w-[34rem]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Meal</TableHead>
            <TableHead numeric className="w-20">kcal</TableHead>
            <TableHead numeric className="w-16">P (g)</TableHead>
            <TableHead numeric className="w-16">C (g)</TableHead>
            <TableHead numeric className="w-16">F (g)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ label, meal }, i) => (
            <TableRow key={`${label}-${i}`} className="align-top">
              <TableCell className="min-w-64 whitespace-normal">
                <span className="t-label block text-muted-foreground">{label}</span>
                <span className="mt-0.5 block">{meal.meal}</span>
              </TableCell>
              <TableCell numeric>{formatNumber(meal.calories)}</TableCell>
              <TableCell numeric>{meal.protein_g}</TableCell>
              <TableCell numeric>{meal.carbs_g}</TableCell>
              <TableCell numeric>{meal.fat_g}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell>Day total</TableCell>
            <TableCell numeric>{formatNumber(sum(rows, "calories"))}</TableCell>
            <TableCell numeric>{sum(rows, "protein_g")}</TableCell>
            <TableCell numeric>{sum(rows, "carbs_g")}</TableCell>
            <TableCell numeric>{sum(rows, "fat_g")}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </section>
  );
}
