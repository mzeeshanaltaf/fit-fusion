"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, DownloadIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadError } from "@/components/dashboard/load-error";
import { PageHeader } from "@/components/dashboard/page-header";
import { useDashboardData } from "@/components/dashboard/dashboard-context";
import { NutritionDay } from "@/components/dashboard/plan/nutrition-day";
import { WorkoutSheet } from "@/components/dashboard/plan/workout-sheet";
import { api, ApiError, localDate } from "@/lib/api";
import {
  dietLabel,
  formatDate,
  formatNumber,
  genderLabel,
  goalLabel,
  levelLabel,
  planTitle,
  sentence,
} from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import type { LogOut, PlanDetail } from "@/lib/types";

type EditKey = `swap-${number}` | `day-${number}`;

const DAYS = [1, 2, 3, 4, 5] as const;

function PlanSkeleton() {
  return (
    <div className="grid gap-8" aria-busy="true" aria-label="Loading your plan">
      <div className="grid gap-3">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="grid gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

async function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { refresh } = useDashboardData();

  const plan = useAsync((s) => api.getPlan(id, s), id);
  const logs = useAsync((s) => api.planLogs(id, s), id);

  // `confirming` is the edit the user is about to commit; `busy` is the one running.
  const [confirming, setConfirming] = useState<EditKey | null>(null);
  const [busy, setBusy] = useState<EditKey | null>(null);
  const [editError, setEditError] = useState<ApiError | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (plan.loading) return <PlanSkeleton />;

  if (plan.error?.status === 404 || plan.error?.status === 422) {
    return (
      <div className="grid gap-8">
        <PageHeader title="Plan not found" />
        <EmptyState
          title="This plan is gone"
          description="It was deleted, or the link is wrong. Your other plans are in My plans."
        >
          <Button asChild>
            <Link href="/dashboard/plans">Open my plans</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }
  if (plan.error || !plan.data) {
    return (
      <div className="grid gap-8">
        <PageHeader title="Plan" />
        <LoadError
          error={plan.error ?? new ApiError(0, "Something went wrong.")}
          onRetry={plan.reload}
          what="this plan"
        />
      </div>
    );
  }

  const p: PlanDetail = plan.data;
  const workouts = p.workout_plan.data;
  const editLimit = p.edit_limit;
  const editsLeft = Math.max(0, editLimit - p.edit_count);
  const logItems: LogOut[] = logs.data?.items ?? [];
  const today = localDate();
  const hasTargets = p.target_calories !== null;

  // ─── Workout logs ───────────────────────────────────────────────
  async function toggleDone(index: number, done: boolean) {
    const previous = logs.data;
    const day = localDate();
    if (done) {
      const temp: LogOut = {
        id: `pending-${index}`,
        plan_id: id,
        workout_index: index,
        performed_on: day,
        notes: null,
        created_at: new Date().toISOString(),
      };
      logs.setData((prev) => ({ items: [temp, ...(prev?.items ?? [])] }));
    } else {
      logs.setData((prev) => ({
        items: (prev?.items ?? []).filter(
          (l) => !(l.workout_index === index && l.performed_on === day)
        ),
      }));
    }
    try {
      if (done) await api.logWorkout(id, index, day);
      else await api.unlogWorkout(id, index, day);
      void logs.reload();
      void refresh(); // overview streak and week
    } catch (err) {
      logs.setData(previous);
      toast.error(err instanceof ApiError ? err.message : "Could not save that. Try again.");
    }
  }

  // ─── Edits (swap, regenerate day) ───────────────────────────────
  async function runEdit(
    key: EditKey,
    call: () => Promise<PlanDetail>,
    message: (before: PlanDetail, after: PlanDetail) => string
  ) {
    setBusy(key);
    setEditError(null);
    try {
      const next = await call();
      plan.setData(next);
      setConfirming(null);
      toast.success(message(p, next));
      void refresh();
    } catch (err) {
      const error = err instanceof ApiError ? err : new ApiError(0, "Something went wrong.");
      setEditError(error);
      setConfirming(null);
      // The plan changed under us, or the budget is spent: show the real numbers.
      if (error.code === "plan_changed" || error.code === "edit_limit_reached") {
        void plan.reload();
      }
    } finally {
      setBusy(null);
    }
  }

  const swap = (index: number) =>
    runEdit(
      `swap-${index}`,
      () => api.swapWorkout(id, index),
      (before, after) => {
        const left = Math.max(0, after.edit_limit - after.edit_count);
        return `Swapped ${before.workout_plan.data[index]?.workout_name} for ${after.workout_plan.data[index]?.workout_name}. ${left} of ${after.edit_limit} edits left.`;
      }
    );

  const regenerate = (day: number) =>
    runEdit(
      `day-${day}`,
      () => api.regenerateDay(id, day),
      (_before, after) =>
        `Day ${day} has new meals. ${Math.max(0, after.edit_limit - after.edit_count)} of ${after.edit_limit} edits left.`
    );

  // ─── PDF and delete ─────────────────────────────────────────────
  async function downloadPdf() {
    setDownloading(true);
    try {
      const { blob, filename } = await api.planPdf(id);
      await saveBlob(blob, filename);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not make the PDF. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function deletePlan() {
    setDeleting(true);
    try {
      await api.deletePlan(id);
      toast.success("Plan deleted.");
      void refresh();
      router.push("/dashboard/plans");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete the plan. Try again.");
      setDeleting(false);
    }
  }

  const editBusy = busy !== null;
  const planProfile: [string, string][] = [
    ["Age", `${p.age}`],
    ["Gender", genderLabel(p.gender)],
    ["Weight", `${p.weight_kg} kg`],
    ["Height", `${p.height_cm} cm`],
    ["Goal", goalLabel(p.fitness_goal)],
    ["Level", levelLabel(p.training_level)],
    ["Days a week", `${p.days_per_week}`],
    ["Diet", dietLabel(p.diet_preference)],
    ["Avoids", p.allergies.length ? p.allergies.map(sentence).join(", ") : "Nothing listed"],
    [
      "Equipment",
      p.equipment.length ? p.equipment.map(sentence).join(", ") : "Any equipment",
    ],
  ];

  return (
    <div className="grid gap-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link href="/dashboard/plans">
            <ArrowLeftIcon aria-hidden />
            All plans
          </Link>
        </Button>
        <PageHeader
          title={planTitle(p)}
          description={`Made ${formatDate(p.created_at)}. ${workouts.length} workout${workouts.length === 1 ? "" : "s"}, 5 meal days.`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={downloadPdf} loading={downloading}>
                <DownloadIcon aria-hidden />
                Download PDF
              </Button>
              <Button variant="outline" onClick={() => setDeleteOpen(true)}>
                <Trash2Icon aria-hidden />
                Delete
              </Button>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-6 border-t-2 border-foreground pt-4 sm:grid-cols-3 lg:grid-cols-5">
        {hasTargets && (
          <>
            <Stat size="sm" label="Calories" value={formatNumber(p.target_calories ?? 0)} unit="kcal" />
            <Stat size="sm" label="Protein" value={p.target_protein_g ?? 0} unit="g" />
            <Stat size="sm" label="Carbs" value={p.target_carbs_g ?? 0} unit="g" />
            <Stat size="sm" label="Fat" value={p.target_fat_g ?? 0} unit="g" />
          </>
        )}
        <Stat
          size="sm"
          label="Edits left"
          value={editsLeft}
          unit={`of ${editLimit}`}
          hint={editsLeft === 0 ? "None left on this plan" : "Swaps and meal days"}
        />
      </div>

      {workouts.length < p.days_per_week && (
        <Alert variant="warning">
          <AlertTitle>
            {workouts.length} workout{workouts.length === 1 ? "" : "s"}, not {p.days_per_week}
          </AlertTitle>
          <AlertDescription>
            Only {workouts.length} workout{workouts.length === 1 ? "" : "s"} in the library fit your
            goal, level and equipment. More equipment, or a different goal, gives you more days.
          </AlertDescription>
        </Alert>
      )}

      {editError && (
        <Alert variant="destructive">
          <AlertTitle>
            {editError.code === "edit_limit_reached" ? "No edits left" : "That change did not happen"}
          </AlertTitle>
          <AlertDescription>
            {editError.message} Nothing was changed and no edit was used.
          </AlertDescription>
        </Alert>
      )}

      {busy && (
        <p role="status" className="t-small font-semibold">
          {busy.startsWith("swap") ? "Finding a new workout" : "Writing new meals"}. This takes 10
          to 30 seconds. Keep this page open.
        </p>
      )}

      <Tabs defaultValue="workouts">
        <TabsList aria-label="Plan sections">
          <TabsTrigger value="workouts">Workouts</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="workouts" className="mt-4 grid gap-10">
          {workouts.map((w, i) => {
            const mine = logItems.filter((l) => l.workout_index === i);
            const past = mine.filter((l) => l.performed_on !== today).map((l) => l.performed_on);
            return (
              <WorkoutSheet
                key={`${w.workout_id}-${i}`}
                workout={w}
                index={i}
                doneToday={mine.some((l) => l.performed_on === today)}
                lastDone={past.length ? past.sort().at(-1)! : null}
                onToggleDone={(done) => void toggleDone(i, done)}
                editsLeft={editsLeft}
                editLimit={editLimit}
                editBusy={editBusy}
                swapping={busy === `swap-${i}`}
                confirming={confirming === `swap-${i}`}
                onAskSwap={() => setConfirming(`swap-${i}`)}
                onCancelSwap={() => setConfirming(null)}
                onConfirmSwap={() => void swap(i)}
              />
            );
          })}
        </TabsContent>

        <TabsContent value="nutrition" className="mt-4 grid gap-10">
          {DAYS.map((d) => (
            <NutritionDay
              key={d}
              day={d}
              data={p.nutrition_plan[`day_${d}` as const]}
              editsLeft={editsLeft}
              editLimit={editLimit}
              editBusy={editBusy}
              regenerating={busy === `day-${d}`}
              confirming={confirming === `day-${d}`}
              onAskRegenerate={() => setConfirming(`day-${d}`)}
              onCancel={() => setConfirming(null)}
              onConfirm={() => void regenerate(d)}
            />
          ))}
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <div className="border-t-2 border-foreground">
            <dl className="grid sm:grid-cols-2 sm:gap-x-10">
              {planProfile.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-b border-border py-3"
                >
                  <dt className="t-label text-muted-foreground">{label}</dt>
                  <dd className="t-num text-right text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteOpen} onOpenChange={(o) => !deleting && setDeleteOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="t-heading">Delete this plan?</DialogTitle>
            <DialogDescription>
              The plan and the workouts you logged against it are deleted for good. The credit it
              cost is not refunded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Keep plan
            </Button>
            <Button variant="destructive" onClick={deletePlan} loading={deleting}>
              Delete plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
