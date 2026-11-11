"use client";

import Link from "next/link";
import { CheckIcon, MinusIcon } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadError } from "@/components/dashboard/load-error";
import { PageHeader, Section } from "@/components/dashboard/page-header";
import { useDashboardData } from "@/components/dashboard/dashboard-context";
import { api } from "@/lib/api";
import { formatDate, planTitle } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { cn } from "@/lib/utils";
import type { ProgressResponse } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function WeekStrip({ progress }: { progress: ProgressResponse }) {
  return (
    <ol className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="This week, Monday to Sunday">
      {progress.week.days.map((d, i) => {
        const isToday = d.date === progress.today;
        const done = d.sessions > 0;
        const dayNumber = Number(d.date.slice(8, 10));
        return (
          <li
            key={d.date}
            aria-current={isToday ? "date" : undefined}
            className={cn(
              "flex min-h-24 flex-col justify-between rounded-md border p-2 sm:p-3",
              done ? "border-foreground bg-foreground text-background" : "border-border bg-card",
              isToday && !done && "border-2 border-foreground"
            )}
          >
            <div className="t-label flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-1">
              <span>{WEEKDAYS[i]}</span>
              <span className="t-num font-semibold">{dayNumber}</span>
            </div>
            <p className="t-num flex items-center gap-1 text-xl font-bold">
              {done ? (
                <>
                  <CheckIcon aria-hidden className="size-4" strokeWidth={3} />
                  <span>{d.sessions}</span>
                  <span className="sr-only">
                    {d.sessions === 1 ? "session" : "sessions"} on {d.date}
                  </span>
                </>
              ) : (
                <>
                  <MinusIcon aria-hidden className="size-4 text-muted-foreground" />
                  <span className="sr-only">No session on {d.date}</span>
                </>
              )}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-8" aria-busy="true" aria-label="Loading your overview">
      <div className="grid gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-8 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { overview, progress, creditBalance, loading, error, refresh } = useDashboardData();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0];

  const latest = overview?.recent_plans[0] ?? null;
  const logs = useAsync(
    async (signal) => (latest ? api.planLogs(latest.id, signal) : { items: [] }),
    latest?.id ?? "none"
  );

  if (loading) return <OverviewSkeleton />;
  if (error && !overview) {
    return (
      <div className="grid gap-8">
        <PageHeader title="Overview" />
        <LoadError error={error} onRetry={refresh} what="your overview" />
      </div>
    );
  }

  const week = progress?.week;
  const weekStart = week?.start ?? "";
  const weekEnd = week?.end ?? "";
  const doneThisWeek = new Set(
    (logs.data?.items ?? [])
      .filter((l) => l.performed_on >= weekStart && l.performed_on <= weekEnd)
      .map((l) => l.workout_index)
  );
  const hasPlans = (overview?.total_plans ?? 0) > 0;
  const activeJob = overview?.active_job;
  const target = week?.target_days ?? null;

  return (
    <div className="grid gap-10">
      <PageHeader
        title="Overview"
        description={
          firstName
            ? `Hi ${firstName}. Here is your week.`
            : "Here is your week."
        }
        action={
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/dashboard/generate">Generate plan</Link>
          </Button>
        }
      />

      {activeJob && (activeJob.status === "queued" || activeJob.status === "running") && (
        <Alert variant="info">
          <AlertTitle>A plan is being built</AlertTitle>
          <AlertDescription>
            It takes about 30 seconds.{" "}
            <Link href="/dashboard/generate" className="font-semibold text-foreground underline">
              Watch it finish
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <Section title="This week" aside={week ? `${formatDate(week.start)} to ${formatDate(week.end)}` : undefined}>
        <div className="grid gap-8 sm:grid-cols-3">
          <Stat
            label="Sessions"
            value={week?.sessions ?? 0}
            unit={target ? `of ${target}` : undefined}
            hint={
              target
                ? `${week?.active_days ?? 0} active day${week?.active_days === 1 ? "" : "s"}`
                : "Log a workout from a plan"
            }
          />
          <Stat
            label="Streak"
            value={progress?.streak_weeks ?? 0}
            unit={progress?.streak_weeks === 1 ? "week" : "weeks"}
            hint={`${progress?.streak_days ?? 0} day${progress?.streak_days === 1 ? "" : "s"} in a row`}
          />
          <Stat
            label="Credits"
            value={creditBalance}
            hint={
              <Link href="/dashboard/credits" className="underline underline-offset-4">
                1 credit per plan
              </Link>
            }
          />
        </div>
        {progress && (
          <div className="mt-6">
            <WeekStrip progress={progress} />
          </div>
        )}
      </Section>

      {!hasPlans ? (
        <EmptyState
          title="No plans yet"
          description={`A plan takes about 30 seconds and costs 1 credit. You have ${creditBalance} credit${creditBalance === 1 ? "" : "s"}.`}
        >
          <Button asChild>
            <Link href="/dashboard/generate">Generate your first plan</Link>
          </Button>
        </EmptyState>
      ) : latest ? (
        <Section
          title="Latest plan"
          aside={
            <>
              {formatDate(latest.created_at)} ·{" "}
              <Link href="/dashboard/plans" className="underline underline-offset-4">
                All {overview?.total_plans} plans
              </Link>
            </>
          }
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="t-heading">{planTitle(latest)}</h3>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/plans/${latest.id}`}>Open plan</Link>
            </Button>
          </div>
          <Table aria-label="Workouts in your latest plan, and whether you did them this week">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Workout</TableHead>
                <TableHead numeric>This week</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latest.workout_names.map((name, i) => (
                <TableRow key={`${name}-${i}`}>
                  <TableCell className="font-semibold">
                    <Link
                      href={`/dashboard/plans/${latest.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {name}
                    </Link>
                  </TableCell>
                  <TableCell numeric>
                    {logs.loading ? (
                      <Skeleton className="ml-auto h-4 w-12" />
                    ) : doneThisWeek.has(i) ? (
                      <span className="inline-flex items-center justify-end gap-1">
                        <CheckIcon aria-hidden className="size-4 text-success" strokeWidth={3} />
                        Done
                      </span>
                    ) : (
                      <span className="font-normal text-muted-foreground">To do</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      ) : null}
    </div>
  );
}
