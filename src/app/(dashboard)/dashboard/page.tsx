"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Dumbbell, CreditCard, TrendingUp, ArrowRight } from "lucide-react";
import { useDashboardData } from "@/components/dashboard/dashboard-context";

export default function DashboardPage() {
  const { user } = useUser();
  const { plans, totalPlans, creditBalance, loading } = useDashboardData();

  const latestPlan = plans.length
    ? [...plans].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
    : null;
  const latestGoal = latestPlan
    ? latestPlan.fitness_goal
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "---";

  const stats = [
    { label: "Plans Generated", value: totalPlans, icon: Dumbbell },
    { label: "Credits Remaining", value: String(creditBalance), icon: CreditCard },
    { label: "Latest Goal", value: latestGoal, icon: TrendingUp },
  ];

  const hasPlans = Number(totalPlans) > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user?.firstName ?? "there"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here is an overview of your fitness plan activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!hasPlans ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <Dumbbell className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold">
              Generate your first fitness plan
            </h3>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Enter your profile details and fitness goal to get a personalized
              workout routine and 5-day nutrition plan.
            </p>
            <Button asChild className="gap-2">
              <Link href="/dashboard/generate">
                Create Plan <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Badge variant="secondary" className="mt-4">
              {creditBalance} credits available
            </Badge>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col items-center py-8 text-center">
              <h3 className="mb-2 font-semibold">Generate New Plan</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Create another personalized fitness plan.
              </p>
              <Button asChild className="gap-2">
                <Link href="/dashboard/generate">
                  Generate <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-8 text-center">
              <h3 className="mb-2 font-semibold">View Plans</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Browse your previously generated fitness plans.
              </p>
              <Button asChild variant="outline" className="gap-2">
                <Link href="/dashboard/plans">
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
