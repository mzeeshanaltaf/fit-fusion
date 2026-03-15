"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  FitnessPlan,
  CreditTransaction,
  UserDataResponse,
} from "@/lib/types";

interface DashboardData {
  plans: FitnessPlan[];
  creditBalance: number;
  creditHistory: CreditTransaction[];
  totalPlans: string;
  loading: boolean;
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

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<FitnessPlan[]>([]);
  const [creditBalance, setCreditBalance] = useState(0);
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
  const [totalPlans, setTotalPlans] = useState("0");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const data = await safeFetch<UserDataResponse>("/api/user-data", {
      fitness_plans: [],
      total_fitness_plan: "0",
      current_balance: 0,
      credit_history: [],
    });

    setPlans(Array.isArray(data.fitness_plans) ? data.fitness_plans : []);
    setCreditBalance(data.current_balance ?? 0);
    setCreditHistory(Array.isArray(data.credit_history) ? data.credit_history : []);
    setTotalPlans(data.total_fitness_plan ?? "0");
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <DashboardContext.Provider
      value={{
        plans,
        creditBalance,
        creditHistory,
        totalPlans,
        loading,
        refresh: fetchAll,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
