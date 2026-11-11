import {
  DIET_OPTIONS,
  FITNESS_GOALS,
  GENDER_OPTIONS,
  TRAINING_LEVELS,
} from "@/lib/constants";
import type { TransactionType } from "@/lib/types";

type Option = { readonly value: string; readonly label: string };

function labelFrom(options: readonly Option[], value: string | null | undefined): string {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label ?? value.replace(/_/g, " ");
}

export const goalLabel = (v: string | null | undefined) => labelFrom(FITNESS_GOALS, v);
export const levelLabel = (v: string | null | undefined) => labelFrom(TRAINING_LEVELS, v);
export const genderLabel = (v: string | null | undefined) => labelFrom(GENDER_OPTIONS, v);
export const dietLabel = (v: string | null | undefined) => labelFrom(DIET_OPTIONS, v);

/** "Fat loss, intermediate": the name of a plan. */
export function planTitle(plan: { fitness_goal: string; training_level: string }): string {
  return `${sentence(goalLabel(plan.fitness_goal).toLowerCase())}, ${levelLabel(plan.training_level).toLowerCase()}`;
}

/** "11 Nov 2026" in the user's locale. Call only on the client (after data has loaded). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  // A bare `YYYY-MM-DD` must be read as a local date, not UTC midnight.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const formatNumber = (n: number) => n.toLocaleString("en-US");

/** What a ledger row is called in the credits table. */
export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  signup_bonus: "Sign-up credits",
  fitness_plan_generation: "Plan generated",
  nutrition_plan_generation: "Nutrition plan generated",
  refund: "Refund",
  manual_adjustment: "Adjustment",
  swap: "Swap",
  regenerate: "Regenerate day",
};

/** "hiit" -> "HIIT", "cardio_and_hiit" -> "Cardio and HIIT". */
export const categoryLabel = (c: string) =>
  sentence(c.replace(/_/g, " ")).replace(/hiit/gi, "HIIT");

/** Capitalise the first letter only ("dumbbells" -> "Dumbbells"). */
export const sentence = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
