// ─── Auth Email ───────────────────────────────────────────────────
// Address the OTP emails arrive from. Client-safe (no secret): the auth
// screens name it in their "check your spam folder" note, and the server
// sender falls back to it, so the copy and the real `from` can't drift.
// Must match the address in RESEND_FROM_EMAIL.
export const OTP_SENDER_EMAIL = "noreply@verification.zeeshanai.cloud";

// ─── Fitness Domain Options ───────────────────────────────────────
export const FITNESS_GOALS = [
  { value: "fat_loss", label: "Fat Loss" },
  { value: "muscle_gain", label: "Muscle Gain" },
  { value: "maintenance", label: "Maintenance" },
  { value: "strength", label: "Strength" },
  { value: "endurance", label: "Endurance" },
] as const;

export const TRAINING_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

export const DIET_OPTIONS = [
  { value: "no_restriction", label: "No restriction" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
] as const;

/** Plan input limits. Keep in step with the API's GeneratePlanRequest. */
export const LIMITS = {
  age: { min: 15, max: 100 },
  weight_kg: { min: 25, max: 350 },
  height_cm: { min: 100, max: 250 },
  allergies: { maxItems: 10, maxLength: 40 },
} as const;

/** Edits allowed per plan (swap + regenerate share it). The API sends `edit_limit`; this is a fallback. */
export const DEFAULT_EDIT_LIMIT = 5;
