"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadError } from "@/components/dashboard/load-error";
import { PageHeader } from "@/components/dashboard/page-header";
import { useDashboardData } from "@/components/dashboard/dashboard-context";
import { api, ApiError } from "@/lib/api";
import { dietLabel, formatDate, formatNumber, planTitle } from "@/lib/format";
import type { PlanSummary } from "@/lib/types";

const PAGE_SIZE = 20;

function ListSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Loading your plans">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export default function PlansPage() {
  const { creditBalance } = useDashboardData();
  const [items, setItems] = useState<PlanSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function load(offset: number) {
    try {
      const page = await api.listPlans(PAGE_SIZE, offset);
      setItems((prev) => (offset === 0 ? page.items : [...prev, ...page.items]));
      setTotal(page.total);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not load your plans."));
    }
  }

  useEffect(() => {
    void load(0).finally(() => setLoading(false));
  }, []);

  async function showMore() {
    setLoadingMore(true);
    await load(items.length);
    setLoadingMore(false);
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        title="My plans"
        description="Every plan you have generated, newest first. Open one to train from it, swap a workout, or download the PDF."
        action={
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/dashboard/generate">Generate plan</Link>
          </Button>
        }
      />

      {loading ? (
        <ListSkeleton />
      ) : error && items.length === 0 ? (
        <LoadError
          error={error}
          what="your plans"
          onRetry={() => {
            setLoading(true);
            void load(0).finally(() => setLoading(false));
          }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No plans yet"
          description={`A plan takes about 30 seconds and costs 1 credit. You have ${creditBalance} credit${creditBalance === 1 ? "" : "s"}.`}
        >
          <Button asChild>
            <Link href="/dashboard/generate">Generate your first plan</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4">
          <Table aria-label="Your plans" className="min-w-[40rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Plan</TableHead>
                <TableHead>Made</TableHead>
                <TableHead>Diet</TableHead>
                <TableHead numeric>Workouts</TableHead>
                <TableHead numeric>kcal a day</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/plans/${p.id}`}
                      className="font-semibold underline-offset-4 hover:underline"
                    >
                      {planTitle(p)}
                    </Link>
                    <span className="t-small block text-muted-foreground">
                      {p.workout_names.slice(0, 2).join(", ")}
                      {p.workout_names.length > 2 ? ` and ${p.workout_names.length - 2} more` : ""}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(p.created_at)}</TableCell>
                  <TableCell>{dietLabel(p.diet_preference)}</TableCell>
                  <TableCell numeric>{p.workout_names.length}</TableCell>
                  <TableCell numeric>
                    {p.target_calories === null ? "-" : formatNumber(p.target_calories)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="t-small text-muted-foreground">
              Showing <span className="t-num font-semibold">{items.length}</span> of{" "}
              <span className="t-num font-semibold">{total}</span>
            </p>
            {items.length < total && (
              <Button variant="outline" onClick={showMore} loading={loadingMore}>
                Show more
              </Button>
            )}
          </div>
          {error && <LoadError error={error} what="more plans" />}
        </div>
      )}
    </div>
  );
}
