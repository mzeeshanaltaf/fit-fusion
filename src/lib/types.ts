// ─── Fitness Domain Enums ─────────────────────────────────────────
export type FitnessGoal =
  | "fat_loss"
  | "muscle_gain"
  | "maintenance"
  | "strength"
  | "endurance";

export type TrainingLevel = "beginner" | "intermediate" | "advanced";

export type Gender = "male" | "female" | "other";

// ─── Fitness Plan Generation ──────────────────────────────────────
export interface GeneratePlanRequest {
  user_id: string;
  age: number;
  weight_kg: number;
  gender: string;
  height_cm: number;
  fitness_goal: FitnessGoal;
  training_level: TrainingLevel;
}

export interface GeneratePlanResponse {
  success: boolean;
  status: "FITNESS_PLAN_GENERATED";
  message: string;
}

// ─── Exercise & Workout ───────────────────────────────────────────
export interface Exercise {
  reps: string;
  sets: number;
  rest_seconds: number;
  exercise_name: string;
  exercise_slug: string;
  youtube_video_id?: string;
}

export interface WorkoutDetail {
  exercises: Exercise[];
  duration_minutes: number;
  equipment_needed: string[];
}

export interface Workout {
  workout_id: string;
  fitness_goal: string;
  workout_name: string;
  training_level: string;
  workout_detail: WorkoutDetail;
  workout_category: string;
}

// ─── Meal & Nutrition ─────────────────────────────────────────────
export interface Meal {
  meal: string;
  fat_g: number;
  carbs_g: number;
  calories: number;
  protein_g: number | string; // API sometimes returns string
}

export interface DayNutrition {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snacks: Meal[];
}

export interface NutritionPlan {
  [key: string]: DayNutrition;
}

// ─── Full Fitness Plan ────────────────────────────────────────────
export interface FitnessPlan {
  id: string;
  user_id: string;
  age: number;
  weight_kg: string;
  height_cm: string;
  gender: string;
  fitness_goal: FitnessGoal;
  training_level: TrainingLevel;
  workout_plan: {
    data: Workout[];
  };
  nutrition_plan: NutritionPlan;
  created_at: string;
  updated_at: string;
}

// ─── Analytics ────────────────────────────────────────────────────
export interface UserAnalytics {
  total_fitness_plan: string;
}

// ─── Credits ──────────────────────────────────────────────────────
export interface CreditBalance {
  current_balance: number;
}

export interface CreditTransaction {
  transaction_id: string;
  user_id: string;
  transaction_type: string;
  credits_delta: number;
  reference_id: string | null;
  name_snapshot: string | null;
  description: string;
  created_at: string;
}

export interface SignupCreditsResponse {
  success: boolean;
  status: "CREDITS_ASSIGNED";
  message: string;
}

// ─── Unified User Data (single webhook response) ────────────────
export interface UserDataResponse {
  fitness_plans: FitnessPlan[];
  total_fitness_plan: string;
  current_balance: number;
  credit_history: CreditTransaction[];
}
