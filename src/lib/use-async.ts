"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";

interface AsyncState<T> {
  data: T | null;
  error: ApiError | null;
  /** True until the first result (or error) arrives. */
  loading: boolean;
  /** Re-run the fetcher; keeps showing the old data while it runs. */
  reload: () => Promise<void>;
  /** Replace the data locally (after an edit whose response already holds the new state). */
  setData: (next: T | null | ((prev: T | null) => T | null)) => void;
}

function toApiError(err: unknown): ApiError {
  return err instanceof ApiError
    ? err
    : new ApiError(0, err instanceof Error ? err.message : "Something went wrong.");
}

/**
 * Runs `fetcher` on mount and whenever `key` changes. Aborts the previous request,
 * ignores results that arrive after unmount, and exposes `reload` for refreshes.
 */
export function useAsync<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  key: string | number = ""
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const run = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const result = await fetcherRef.current(controller.signal);
      if (controller.signal.aborted) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(toApiError(err));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setError(null);
    void run();
    return () => controllerRef.current?.abort();
  }, [run, key]);

  return { data, error, loading, reload: run, setData };
}
