"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "@/lib/api";
import type { OverviewResponse, ProgressResponse } from "@/lib/types";

/**
 * Data every dashboard screen shares: the overview (credit balance, plan count, newest
 * plans, any running job) and this week's progress. Screens that need more (the full
 * plan list, credit history, one plan) fetch it themselves through `api`.
 */
interface DashboardData {
  overview: OverviewResponse | null;
  progress: ProgressResponse | null;
  creditBalance: number;
  /** True until the first overview has loaded. */
  loading: boolean;
  /** Set when the overview could not be loaded; screens show a retry. */
  error: ApiError | null;
  refresh: () => Promise<void>;
}

const DashboardContext = createContext<DashboardData | null>(null);

export function useDashboardData() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboardData must be used within DashboardDataProvider");
  }
  return ctx;
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refresh = useCallback(async () => {
    // Progress is secondary: a failure there must not hide the overview.
    const [ov, pr] = await Promise.allSettled([api.overview(), api.progress()]);
    if (ov.status === "fulfilled") {
      setOverview(ov.value);
      setError(null);
    } else {
      const err =
        ov.reason instanceof ApiError
          ? ov.reason
          : new ApiError(0, "Could not load your data.");
      setError(err);
    }
    if (pr.status === "fulfilled") setProgress(pr.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // The session is gone (expired, signed out in another tab): back to sign-in.
  useEffect(() => {
    if (error?.status === 401) window.location.assign("/sign-in");
  }, [error]);

  const value = useMemo<DashboardData>(
    () => ({
      overview,
      progress,
      creditBalance: overview?.current_balance ?? 0,
      loading,
      error,
      refresh,
    }),
    [overview, progress, loading, error, refresh]
  );

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}
