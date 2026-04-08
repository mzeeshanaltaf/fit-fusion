"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Clock,
  Dumbbell,
  Apple,
  User,
  Calendar,
} from "lucide-react";
import type { DayNutrition } from "@/lib/types";
import { useDashboardData } from "@/components/dashboard/dashboard-context";
import { YouTubePlayerDialog } from "@/components/dashboard/youtube-player-dialog";

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2];
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

function safeNumber(val: number | string): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { plans, loading } = useDashboardData();
  const plan = useMemo(
    () => plans.find((p) => p.id === params.id) ?? null,
    [plans, params.id]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <Dumbbell className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h2 className="mb-2 text-lg font-semibold">Plan not found</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          This fitness plan does not exist or has been removed.
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard/plans")}>
          Back to Plans
        </Button>
      </div>
    );
  }

  const nutritionDays = Object.entries(plan.nutrition_plan).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 gap-1.5"
            onClick={() => router.push("/dashboard/plans")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Plans
          </Button>
          <h1 className="text-2xl font-bold capitalize tracking-tight">
            {plan.fitness_goal.replace("_", " ")} Plan
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(plan.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="capitalize">
            {plan.training_level}
          </Badge>
          <Badge variant="outline">
            {plan.workout_plan.data.length} workouts
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="workouts">
        <TabsList>
          <TabsTrigger value="workouts" className="gap-1.5">
            <Dumbbell className="h-3.5 w-3.5" />
            Workouts
          </TabsTrigger>
          <TabsTrigger value="nutrition" className="gap-1.5">
            <Apple className="h-3.5 w-3.5" />
            Nutrition
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" />
            Profile
          </TabsTrigger>
        </TabsList>

        {/* Workouts Tab */}
        <TabsContent value="workouts" className="space-y-4">
          {plan.workout_plan.data.map((workout) => (
            <Card key={workout.workout_id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">
                      {workout.workout_name}
                    </CardTitle>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {workout.workout_detail.duration_minutes} min
                    </div>
                  </div>
                  <Badge className="capitalize">
                    {workout.workout_category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Exercises */}
                <div className="grid gap-4">
                  {workout.workout_detail.exercises.map((ex) => {
                    const videoId = ex.youtube_video_id
                      ? extractYouTubeId(ex.youtube_video_id)
                      : null;
                    return (
                      <div
                        key={ex.exercise_slug}
                        className="rounded-lg border border-border/50 p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row">
                          {/* Video embed */}
                          {videoId && (
                            <YouTubePlayerDialog
                              videoId={videoId}
                              exerciseName={ex.exercise_name}
                            />
                          )}

                          {/* Exercise details */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{ex.exercise_name}</h4>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span>
                                <span className="font-medium text-foreground">{ex.sets}</span> sets
                              </span>
                              <span>
                                <span className="font-medium text-foreground">{ex.reps}</span> reps
                              </span>
                              <span>
                                <span className="font-medium text-foreground">{ex.rest_seconds}s</span> rest
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Equipment */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    Equipment:
                  </span>
                  {workout.workout_detail.equipment_needed.map((eq) => (
                    <Badge key={eq} variant="outline" className="text-xs capitalize">
                      {eq}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Nutrition Tab */}
        <TabsContent value="nutrition" className="space-y-4">
          {nutritionDays.map(([dayKey, day]) => {
            const dayNutrition = day as DayNutrition;
            const dayNum = dayKey.replace("day_", "");
            const meals = [
              { label: "Breakfast", data: dayNutrition.breakfast },
              { label: "Lunch", data: dayNutrition.lunch },
              { label: "Dinner", data: dayNutrition.dinner },
              ...dayNutrition.snacks.map((s, i) => ({
                label: `Snack ${dayNutrition.snacks.length > 1 ? i + 1 : ""}`.trim(),
                data: s,
              })),
            ];

            const totalCals = meals.reduce(
              (sum, m) => sum + safeNumber(m.data.calories),
              0
            );
            const totalProtein = meals.reduce(
              (sum, m) => sum + safeNumber(m.data.protein_g),
              0
            );
            const totalCarbs = meals.reduce(
              (sum, m) => sum + safeNumber(m.data.carbs_g),
              0
            );
            const totalFat = meals.reduce(
              (sum, m) => sum + safeNumber(m.data.fat_g),
              0
            );

            return (
              <Card key={dayKey}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Day {dayNum}</CardTitle>
                    <div className="flex gap-2 text-xs">
                      <Badge variant="outline">{totalCals} cal</Badge>
                      <Badge variant="outline">{totalProtein}g protein</Badge>
                      <Badge variant="outline">{totalCarbs}g carbs</Badge>
                      <Badge variant="outline">{totalFat}g fat</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {meals.map(({ label, data }) => (
                    <div
                      key={label}
                      className="rounded-lg border border-border/50 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {data.meal}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5 text-xs text-muted-foreground">
                          <span>{safeNumber(data.calories)} cal</span>
                          <span>·</span>
                          <span>P {safeNumber(data.protein_g)}g</span>
                          <span>·</span>
                          <span>C {safeNumber(data.carbs_g)}g</span>
                          <span>·</span>
                          <span>F {safeNumber(data.fat_g)}g</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Plan Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Age", value: `${plan.age} years` },
                  { label: "Gender", value: plan.gender },
                  { label: "Weight", value: `${plan.weight_kg} kg` },
                  { label: "Height", value: `${plan.height_cm} cm` },
                  {
                    label: "Fitness Goal",
                    value: plan.fitness_goal.replace("_", " "),
                  },
                  { label: "Training Level", value: plan.training_level },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-border/50 p-3">
                    <dt className="text-xs font-medium text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium capitalize">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
