import { LIMITS } from "@/lib/constants";
import type {
  DietPreference,
  FitnessGoal,
  Gender,
  GeneratePlanRequest,
  ProfileResponse,
  ProfileUpdate,
  TrainingLevel,
} from "@/lib/types";

/**
 * Form state shared by Generate and Settings. Numbers stay strings while typing.
 *
 * Equipment is three explicit choices because the API treats an EMPTY list as "no
 * restriction": `any` -> [], `bodyweight` -> ["bodyweight"], `pick` -> the chosen names.
 */
export type EquipmentMode = "any" | "bodyweight" | "pick";

export interface PlanFormState {
  age: string;
  weight_kg: string;
  height_cm: string;
  gender: Gender | "";
  fitness_goal: FitnessGoal | "";
  training_level: TrainingLevel | "";
  diet_preference: DietPreference;
  allergies: string[];
  equipmentMode: EquipmentMode;
  /** Picked equipment, never including "bodyweight". */
  equipment: string[];
  days_per_week: number | null;
}

export type FormErrors = Partial<Record<keyof PlanFormState, string>>;

export const emptyForm: PlanFormState = {
  age: "",
  weight_kg: "",
  height_cm: "",
  gender: "",
  fitness_goal: "",
  training_level: "",
  diet_preference: "no_restriction",
  allergies: [],
  equipmentMode: "any",
  equipment: [],
  days_per_week: null,
};

const ALLERGY_PATTERN = /^[A-Za-z0-9 \-'/&().]+$/;

const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

export function formFromProfile(p: ProfileResponse): PlanFormState {
  const equipment = p.equipment ?? [];
  const picked = equipment.filter((e) => e !== "bodyweight");
  const mode: EquipmentMode =
    equipment.length === 0 ? "any" : picked.length === 0 ? "bodyweight" : "pick";
  return {
    age: str(p.age),
    weight_kg: str(p.weight_kg),
    height_cm: str(p.height_cm),
    gender: p.gender ?? "",
    fitness_goal: p.fitness_goal ?? "",
    training_level: p.training_level ?? "",
    diet_preference: p.diet_preference,
    allergies: p.allergies ?? [],
    equipmentMode: mode,
    equipment: picked,
    days_per_week: p.days_per_week ?? null,
  };
}

function equipmentList(f: PlanFormState): string[] {
  if (f.equipmentMode === "any") return [];
  if (f.equipmentMode === "bodyweight" || f.equipment.length === 0) return ["bodyweight"];
  return f.equipment;
}

const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));

/** PUT /profile replaces the whole record: blanks become null / empty. */
export function toProfileUpdate(f: PlanFormState): ProfileUpdate {
  return {
    age: numOrNull(f.age),
    weight_kg: numOrNull(f.weight_kg),
    height_cm: numOrNull(f.height_cm),
    gender: f.gender || null,
    fitness_goal: f.fitness_goal || null,
    training_level: f.training_level || null,
    diet_preference: f.diet_preference,
    allergies: f.allergies,
    equipment: equipmentList(f),
    days_per_week: f.days_per_week,
  };
}

/** Only call after `validatePlanForm(f, true)` returned no errors. */
export function toGenerateRequest(f: PlanFormState): GeneratePlanRequest {
  return {
    age: Number(f.age),
    weight_kg: Number(f.weight_kg),
    height_cm: Number(f.height_cm),
    gender: f.gender as Gender,
    fitness_goal: f.fitness_goal as FitnessGoal,
    training_level: f.training_level as TrainingLevel,
    diet_preference: f.diet_preference,
    allergies: f.allergies,
    equipment: equipmentList(f),
    days_per_week: f.days_per_week ?? 3,
  };
}

function checkNumber(
  raw: string,
  { min, max }: { min: number; max: number },
  noun: string,
  required: boolean
): string | undefined {
  if (raw.trim() === "") return required ? `Enter your ${noun}` : undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) {
    return `Enter a ${noun} between ${min} and ${max}`;
  }
  return undefined;
}

/** `requireAll` is true for generating a plan; Settings may save a partial profile. */
export function validatePlanForm(f: PlanFormState, requireAll: boolean): FormErrors {
  const e: FormErrors = {};
  const age = checkNumber(f.age, LIMITS.age, "age", requireAll);
  if (age) e.age = age;
  const weight = checkNumber(f.weight_kg, LIMITS.weight_kg, "weight in kg", requireAll);
  if (weight) e.weight_kg = weight;
  const height = checkNumber(f.height_cm, LIMITS.height_cm, "height in cm", requireAll);
  if (height) e.height_cm = height;

  if (requireAll) {
    if (!f.gender) e.gender = "Choose one";
    if (!f.fitness_goal) e.fitness_goal = "Choose your goal";
    if (!f.training_level) e.training_level = "Choose your level";
    if (f.days_per_week === null) e.days_per_week = "Choose how many days a week you train";
  }
  if (f.equipmentMode === "pick" && f.equipment.length === 0) {
    e.equipment = "Pick at least one item, or choose bodyweight only";
  }
  return e;
}

/** Why an allergy can't be added, or null if it can. */
export function allergyProblem(value: string, existing: string[]): string | null {
  const v = value.trim();
  if (!v) return null;
  if (v.length > LIMITS.allergies.maxLength) {
    return `Keep each item under ${LIMITS.allergies.maxLength} characters`;
  }
  if (!ALLERGY_PATTERN.test(v)) {
    return "Use letters, numbers, spaces and - ' / & ( ) . only";
  }
  if (existing.length >= LIMITS.allergies.maxItems) {
    return `You can list up to ${LIMITS.allergies.maxItems} items`;
  }
  return null;
}
