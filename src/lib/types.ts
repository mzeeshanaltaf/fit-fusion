/**
 * Named types for the FastAPI backend.
 *
 * Every shape here is an alias of `./api-schema.d.ts`, which is GENERATED from the
 * backend's OpenAPI schema. Do not edit that file; regenerate it with:
 *
 *     npm run gen:types      (needs `uv` and the backend deps: cd backend && uv sync)
 *
 * and commit the result. When a backend schema changes, re-run it and fix the compile
 * errors, which point at every screen that needs to follow.
 */
import type { components } from "./api-schema";

type S = components["schemas"];

// ─── Enums ────────────────────────────────────────────────────────
export type FitnessGoal = S["GeneratePlanRequest"]["fitness_goal"];
export type TrainingLevel = S["GeneratePlanRequest"]["training_level"];
export type Gender = S["GeneratePlanRequest"]["gender"];
export type DietPreference = S["GeneratePlanRequest"]["diet_preference"];
export type JobStatus = S["JobResponse"]["status"];
export type TransactionType = S["CreditTransactionOut"]["transaction_type"];

// ─── Plans ────────────────────────────────────────────────────────
export type GeneratePlanRequest = S["GeneratePlanRequest"];
export type PlanSummary = S["PlanSummary"];
export type PlanDetail = S["PlanDetail"];
export type PlanList = S["PlanList"];
export type PlanWorkout = S["PlanWorkout"];
export type Exercise = S["Exercise"];
export type NutritionPlan = S["NutritionPlan"];
export type DayNutrition = S["DayNutrition"];
export type Meal = S["Meal"];

// ─── Jobs, overview ───────────────────────────────────────────────
export type JobResponse = S["JobResponse"];
export type OverviewResponse = S["OverviewResponse"];

// ─── Credits ──────────────────────────────────────────────────────
export type CreditBalance = S["CreditBalance"];
export type CreditTransaction = S["CreditTransactionOut"];
export type CreditHistoryPage = S["CreditHistoryPage"];

// ─── Profile, logs, progress, library ─────────────────────────────
export type ProfileResponse = S["ProfileResponse"];
export type ProfileUpdate = S["ProfileUpdate"];
export type LogOut = S["LogOut"];
export type LogList = S["LogList"];
export type ProgressResponse = S["ProgressResponse"];
export type WeekDay = S["WeekDay"];
export type EquipmentList = S["EquipmentList"];
