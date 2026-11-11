"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api";

/** Inline failure for a screen's data, with the one thing to do next. */
export function LoadError({
  error,
  onRetry,
  what = "this page",
}: {
  error: ApiError | Error;
  onRetry?: () => void;
  what?: string;
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Could not load {what}</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
      {onRetry ? (
        <div className="mt-2">
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </Alert>
  );
}
