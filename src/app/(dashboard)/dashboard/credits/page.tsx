"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { api, ApiError } from "@/lib/api";
import { DEFAULT_EDIT_LIMIT } from "@/lib/constants";
import { formatDateTime, TRANSACTION_LABELS } from "@/lib/format";
import type { CreditTransaction } from "@/lib/types";

const PAGE_SIZE = 20;

export default function CreditsPage() {
  const { creditBalance, loading: balanceLoading } = useDashboardData();
  const [items, setItems] = useState<CreditTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function load(offset: number) {
    try {
      const page = await api.creditHistory(PAGE_SIZE, offset);
      setItems((prev) => (offset === 0 ? page.items : [...prev, ...page.items]));
      setTotal(page.total);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not load your history."));
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
    <div className="grid gap-10">
      <PageHeader
        title="Credits"
        description={`A plan costs 1 credit, and a failed plan is refunded. Swapping a workout or regenerating a meal day is free, up to ${DEFAULT_EDIT_LIMIT} edits per plan.`}
        action={
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/dashboard/generate">Generate plan</Link>
          </Button>
        }
      />

      <div className="border-t-2 border-foreground pt-4">
        {balanceLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-24 w-40" />
          </div>
        ) : (
          <Stat
            size="xl"
            label="Balance"
            value={creditBalance}
            unit={creditBalance === 1 ? "credit" : "credits"}
            hint={
              creditBalance === 0
                ? "Your plans, PDFs and logs stay available."
                : `${creditBalance} more plan${creditBalance === 1 ? "" : "s"} you can generate.`
            }
          />
        )}
      </div>

      <Section title="History">
        {loading ? (
          <div className="grid gap-3" aria-busy="true" aria-label="Loading your credit history">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error && items.length === 0 ? (
          <LoadError
            error={error}
            what="your credit history"
            onRetry={() => {
              setLoading(true);
              void load(0).finally(() => setLoading(false));
            }}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            description="Every credit you receive or spend is listed here, with the date. Generate a plan and the first row appears."
          />
        ) : (
          <div className="grid gap-4">
            <Table aria-label="Credit history" className="min-w-[32rem]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>What</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead numeric>Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((tx) => {
                  const label = TRANSACTION_LABELS[tx.transaction_type] ?? tx.transaction_type;
                  // Edits are logged with 0 credits: show a dash, never "+0".
                  const delta = tx.credits_delta;
                  return (
                    <TableRow key={tx.transaction_id}>
                      <TableCell>
                        <span className="font-semibold">{label}</span>
                        {tx.name_snapshot && (
                          <span className="t-small block text-muted-foreground">
                            {tx.name_snapshot.replace(/_/g, " ")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(tx.created_at)}
                      </TableCell>
                      <TableCell numeric>
                        {delta === 0 ? (
                          <>
                            <span aria-hidden>-</span>
                            <span className="sr-only">no credits</span>
                          </>
                        ) : delta > 0 ? (
                          `+${delta}`
                        ) : (
                          // A real minus sign, not a hyphen, so it lines up with the plus.
                          `−${Math.abs(delta)}`
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
            {error && <LoadError error={error} what="more history" />}
          </div>
        )}
      </Section>
    </div>
  );
}
