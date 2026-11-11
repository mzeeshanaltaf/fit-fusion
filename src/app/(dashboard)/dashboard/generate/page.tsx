"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardPlus } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/dashboard/page-header";
import { PlanFields } from "@/components/dashboard/plan-fields";
import { JobProgress } from "@/components/dashboard/job-progress";
import {
  emptyForm,
  formFromProfile,
  toGenerateRequest,
  toProfileUpdate,
  validatePlanForm,
  type FormErrors,
  type PlanFormState,
} from "@/components/dashboard/plan-form";
import { useDashboardData } from "@/components/dashboard/dashboard-context";
import { api, ApiError } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import type { JobResponse } from "@/lib/types";

const POLL_MS = 2000;
const MAX_POLL_FAILURES = 6;

const isActive = (j: JobResponse | null) =>
  !!j && (j.status === "queued" || j.status === "running");

export default function GeneratePlanPage() {
  const router = useRouter();
  const { overview, creditBalance, loading: dashLoading, refresh } = useDashboardData();

  const profile = useAsync((s) => api.getProfile(s), "profile");
  const equipment = useAsync((s) => api.equipment(s), "equipment");

  const [form, setForm] = useState<PlanFormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  // Pre-fill once from the saved profile (never overwrite what the user is typing).
  const prefilled = useRef(false);
  useEffect(() => {
    if (profile.data && !prefilled.current) {
      prefilled.current = true;
      setForm(formFromProfile(profile.data));
    }
  }, [profile.data]);

  // A job that was started before a reload or from another page: pick up where it is.
  const resumed = useRef(false);
  useEffect(() => {
    if (!resumed.current && overview?.active_job) {
      resumed.current = true;
      setJob((current) => current ?? overview.active_job);
    }
  }, [overview]);

  // Poll the job until it reaches a final state.
  const jobId = job?.id;
  const active = isActive(job);
  useEffect(() => {
    if (!jobId || !active) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;

    const tick = async () => {
      try {
        const next = await api.getJob(jobId);
        if (cancelled) return;
        failures = 0;
        setJob(next);
        if (next.status === "succeeded" || next.status === "failed") return;
      } catch (err) {
        if (cancelled) return;
        failures += 1;
        const gone = err instanceof ApiError && err.status === 404;
        if (gone || failures >= MAX_POLL_FAILURES) {
          setPollError(
            "Lost contact with the server. Your plan may still be on its way: check My plans in a minute."
          );
          return;
        }
      }
      timer = setTimeout(tick, POLL_MS);
    };

    timer = setTimeout(tick, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobId, active]);

  // React to the final state exactly once per job.
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!job || handled.current === job.id) return;
    if (job.status === "succeeded" && job.plan_id) {
      handled.current = job.id;
      void refresh();
      toast.success("Your plan is ready.");
      router.push(`/dashboard/plans/${job.plan_id}`);
    } else if (job.status === "failed") {
      handled.current = job.id;
      void refresh(); // the credit was refunded
    }
  }, [job, refresh, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || active) return;

    const found = validatePlanForm(form, true);
    setErrors(found);
    setSubmitError(null);
    if (Object.keys(found).length > 0) {
      // Move focus to the first problem so a keyboard or phone user sees it.
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"], [data-slot="field-error"]')?.scrollIntoView({
          block: "center",
        })
      );
      return;
    }

    setSubmitting(true);
    try {
      const started = await api.generatePlan(toGenerateRequest(form));
      handled.current = null;
      setPollError(null);
      setJob(started);
      void refresh(); // the credit is reserved right away
      // Remember the answers for next time. Best effort: the plan matters more.
      api.saveProfile(toProfileUpdate(form)).catch(() => {});
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setOutOfCredits(true);
        void refresh();
      } else {
        setSubmitError(
          err instanceof ApiError ? err.message : "Something went wrong. Try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const failed = job?.status === "failed";
  const noCredits = outOfCredits || (!dashLoading && creditBalance <= 0 && !active);
  const formReady = !profile.loading || profile.error !== null;

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Generate plan"
        description="Tell us about you. You get a workout plan from 250 real workouts and five days of meals with calorie and macro targets. A plan costs 1 credit; if it fails, the credit comes back."
      />

      {noCredits ? (
        <EmptyState
          title="No credits left"
          description="Each plan costs 1 credit and you have none. Your existing plans, PDFs and workout logs stay available."
        >
          <Button asChild>
            <Link href="/dashboard/plans">Open my plans</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/credits">See credit history</Link>
          </Button>
        </EmptyState>
      ) : !formReady ? (
        <div className="grid gap-6" aria-busy="true" aria-label="Loading your saved details">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="grid max-w-3xl gap-8">
          <div
            className="grid gap-8 aria-disabled:pointer-events-none aria-disabled:opacity-60"
            aria-disabled={active || undefined}
            inert={active || undefined}
          >
            <PlanFields
              value={form}
              onChange={setForm}
              errors={errors}
              equipmentOptions={equipment.data?.equipment ?? null}
              equipmentFailed={equipment.error !== null}
            />
          </div>

          {submitError && (
            <Alert variant="destructive">
              <AlertTitle>The plan could not start</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {failed && job && (
            <Alert variant="destructive">
              <AlertTitle>The plan failed</AlertTitle>
              <AlertDescription>
                {job.error ?? "Something went wrong. Your credit was refunded."}
              </AlertDescription>
            </Alert>
          )}

          {pollError && (
            <Alert variant="warning">
              <AlertTitle>Still working?</AlertTitle>
              <AlertDescription>{pollError}</AlertDescription>
            </Alert>
          )}

          {active && job ? (
            <JobProgress job={job} />
          ) : (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t-2 border-foreground pt-4">
              <Button
                type="submit"
                size="lg"
                loading={submitting}
                className="w-full sm:w-auto"
              >
                <ClipboardPlus aria-hidden />
                {failed ? "Try again" : "Generate plan"}
              </Button>
              <p className="t-small text-muted-foreground">
                Costs 1 credit. You have{" "}
                <Link href="/dashboard/credits" className="t-num font-semibold text-foreground underline underline-offset-4">
                  {creditBalance}
                </Link>
                .
              </p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
