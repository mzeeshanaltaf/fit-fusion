/*
 * Sample content for the landing page.
 * Workouts and exercises are real rows from the library (fat_loss, intermediate).
 * The profile and the day's totals match a real generation run (34-year-old,
 * 82 kg, 178 cm, pescatarian, 4 days a week: targets 2,050 kcal / 164 P / 220 C / 57 F).
 * Meal wording is a sample; macros per meal are from that run.
 */

export const SAMPLE_WORKOUT = {
  name: "Full Body Strength Builder",
  minutes: 45,
  equipment: "dumbbells, barbell, bench",
  exercises: [
    { name: "Squats", sets: 3, reps: "8-12", rest: 60 },
    { name: "Bench Press", sets: 3, reps: "8-12", rest: 60 },
    { name: "Bent-Over Rows", sets: 3, reps: "8-12", rest: 60 },
    { name: "Overhead Press", sets: 3, reps: "10-15", rest: 45 },
    { name: "Plank", sets: 3, reps: "45-60 s", rest: 30 },
  ],
};

export const SAMPLE_PROFILE = [
  { label: "Age", value: "34" },
  { label: "Weight", value: "82 kg" },
  { label: "Height", value: "178 cm" },
  { label: "Goal", value: "Fat loss" },
  { label: "Level", value: "Intermediate" },
  { label: "Diet", value: "Pescatarian" },
  { label: "Days a week", value: "4" },
];

export const SAMPLE_TARGETS = {
  kcal: "2,050",
  protein: "164",
  carbs: "220",
  fat: "57",
};

export const SAMPLE_WEEK = [
  { name: "Full Body Compound Lift", minutes: 55, kind: "Strength" },
  { name: "Full Body Strength Builder", minutes: 45, kind: "Strength" },
  { name: "Metabolic Mayhem Circuit", minutes: 35, kind: "HIIT" },
  { name: "Dynamic Mobility Flow", minutes: 25, kind: "Mobility" },
];

export const SAMPLE_MEALS = [
  {
    slot: "Breakfast",
    meal: "Greek yogurt (250 g), oats (50 g), blueberries (100 g), chia seeds (10 g)",
    kcal: 477,
    p: 35,
    c: 55,
    f: 13,
  },
  {
    slot: "Lunch",
    meal: "Tuna (160 g), brown rice (200 g cooked), broccoli, olive oil (10 g)",
    kcal: 547,
    p: 43,
    c: 60,
    f: 15,
  },
  {
    slot: "Dinner",
    meal: "Baked cod (180 g), sweet potato (200 g), lentils (100 g cooked), olive oil (15 g)",
    kcal: 574,
    p: 48,
    c: 55,
    f: 18,
  },
  {
    slot: "Snack",
    meal: "Skyr (250 g), banana, granola (40 g), honey (10 g)",
    kcal: 451,
    p: 38,
    c: 50,
    f: 11,
  },
];
