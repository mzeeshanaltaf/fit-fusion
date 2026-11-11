"use client";

import { ArrowLeftRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { YouTubePlayerDialog } from "@/components/dashboard/youtube-player-dialog";
import { categoryLabel, formatDate, sentence } from "@/lib/format";
import { extractYouTubeId } from "@/lib/youtube";
import type { PlanWorkout } from "@/lib/types";
import { EditConfirm } from "./edit-confirm";

export interface WorkoutSheetProps {
  workout: PlanWorkout;
  index: number;
  doneToday: boolean;
  lastDone: string | null;
  onToggleDone: (done: boolean) => void;
  editsLeft: number;
  editLimit: number;
  /** Another edit is running, so every edit button is off. */
  editBusy: boolean;
  swapping: boolean;
  confirming: boolean;
  onAskSwap: () => void;
  onCancelSwap: () => void;
  onConfirmSwap: () => void;
}

/** One workout as a ruled training sheet: name, meta, done box, swap, and the exercise table. */
export function WorkoutSheet({
  workout,
  index,
  doneToday,
  lastDone,
  onToggleDone,
  editsLeft,
  editLimit,
  editBusy,
  swapping,
  confirming,
  onAskSwap,
  onCancelSwap,
  onConfirmSwap,
}: WorkoutSheetProps) {
  const { workout_detail: detail } = workout;
  const equipment = detail.equipment_needed.length
    ? detail.equipment_needed.map(sentence).join(", ")
    : "No equipment";
  const checkId = `done-${workout.workout_id}-${index}`;

  return (
    <section
      aria-labelledby={`w-${index}`}
      className="grid gap-4 border-t-2 border-foreground pt-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="t-label text-muted-foreground">Workout {index + 1}</p>
          <h3 id={`w-${index}`} className="t-heading mt-1">
            {workout.workout_name}
          </h3>
          <p className="t-small mt-1 text-muted-foreground">
            {categoryLabel(workout.workout_category)}
            <span aria-hidden> / </span>
            <span className="sr-only">, </span>
            <span className="t-num">{detail.duration_minutes}</span> min
            <span aria-hidden> / </span>
            <span className="sr-only">, </span>
            {equipment}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex min-h-10 items-center gap-2">
            <Checkbox
              id={checkId}
              checked={doneToday}
              onCheckedChange={(v) => onToggleDone(v === true)}
            />
            <Label htmlFor={checkId} className="cursor-pointer text-sm font-semibold">
              Done today
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onAskSwap}
            disabled={editBusy || editsLeft <= 0 || confirming}
            title={editsLeft <= 0 ? "No edits left on this plan" : undefined}
          >
            <ArrowLeftRightIcon aria-hidden />
            Swap
            <span className="sr-only"> {workout.workout_name}</span>
          </Button>
        </div>
      </div>

      {lastDone && !doneToday && (
        <p className="t-small text-muted-foreground">Last done {formatDate(lastDone)}.</p>
      )}

      {confirming && (
        <EditConfirm
          description="Replace this workout with another that fits your goal, level and equipment."
          editsLeft={editsLeft}
          editLimit={editLimit}
          seconds="15 seconds"
          confirmLabel="Swap workout"
          busy={swapping}
          onConfirm={onConfirmSwap}
          onCancel={onCancelSwap}
        />
      )}

      <Table density="compact" aria-label={`Exercises in ${workout.workout_name}`} className="min-w-[22rem]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Exercise</TableHead>
            <TableHead numeric className="w-12 sm:w-16">Sets</TableHead>
            <TableHead numeric className="sm:w-44">Reps</TableHead>
            <TableHead numeric className="w-14 sm:w-20">Rest</TableHead>
            <TableHead className="w-10 sm:w-24">
              <span className="sr-only">Video</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {detail.exercises.map((ex, i) => {
            const videoId = extractYouTubeId(ex.youtube_video_id);
            return (
              <TableRow key={`${ex.exercise_slug}-${i}`}>
                <TableCell className="min-w-24 font-semibold">{ex.exercise_name}</TableCell>
                <TableCell numeric>{ex.sets}</TableCell>
                <TableCell numeric className="max-w-28 whitespace-normal sm:max-w-none sm:whitespace-nowrap">{ex.reps}</TableCell>
                <TableCell numeric>{ex.rest_seconds} s</TableCell>
                <TableCell className="w-px text-right">
                  {videoId ? (
                    <YouTubePlayerDialog videoId={videoId} exerciseName={ex.exercise_name} />
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
