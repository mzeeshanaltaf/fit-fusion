"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import type { JobResponse } from "@/lib/types";

/** Plans take about 30 s (28 to 30 s measured). The bar is an estimate, capped below 100. */
const EXPECTED_SECONDS = 32;

const STAGE_TEXT: Record<string, string> = {
  queued: "Queued. Starting in a moment.",
  generating: "Picking workouts and writing five days of meals.",
};

function secondsSince(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : Math.max(0, Math.round((Date.now() - t) / 1000));
}

/** Inline progress for a running generation job. Replaces the old blocking dialog. */
export function JobProgress({ job }: { job: JobResponse }) {
  const startedAt = job.started_at ?? job.created_at;
  const [elapsed, setElapsed] = useState(() => secondsSince(startedAt));

  useEffect(() => {
    const tick = () => setElapsed(secondsSince(startedAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const pct = Math.min(95, Math.round((elapsed / EXPECTED_SECONDS) * 100));
  const text = STAGE_TEXT[job.stage ?? "queued"] ?? STAGE_TEXT.queued;

  return (
    <div
      role="status"
      aria-live="polite"
      className="grid gap-3 border-t-2 border-foreground pt-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <p className="t-heading">Building your plan</p>
        <p className="t-num t-small font-semibold">{elapsed} s</p>
      </div>
      <Progress value={pct} aria-label="Plan progress (estimated)" />
      <p className="t-small text-muted-foreground">
        {text} It usually takes about 30 seconds. You can leave this page; the plan will be in My
        plans when it is ready.
      </p>
    </div>
  );
}
