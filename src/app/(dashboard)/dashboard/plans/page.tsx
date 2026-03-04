"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, ArrowRight, Calendar } from "lucide-react";
import { useDashboardData } from "@/components/dashboard/dashboard-context";

export default function PlansPage() {
  const { plans, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            My Fitness Plans
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your generated workout and nutrition plans.
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            My Fitness Plans
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your generated workout and nutrition plans.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/generate">
            <Dumbbell className="h-4 w-4" />
            New Plan
          </Link>
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <Dumbbell className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold">No plans yet</h3>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Generate your first fitness plan to see it here.
            </p>
            <Button asChild className="gap-2">
              <Link href="/dashboard/generate">
                Generate Plan <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="transition-colors hover:border-primary/30">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg capitalize">
                    {plan.fitness_goal.replace("_", " ")} Plan
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(plan.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {plan.training_level}
                  </Badge>
                  <Badge variant="outline">
                    {plan.workout_plan.data.length} workouts
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {plan.gender}, {plan.age}y, {plan.weight_kg}kg,{" "}
                    {plan.height_cm}cm
                  </p>
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <Link href={`/dashboard/plans/${plan.id}`}>
                      View Details <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
