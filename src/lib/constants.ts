// ─── n8n Webhook URLs ─────────────────────────────────────────────
export const N8N_WEBHOOKS = {
  FITNESS_PLAN:
    "https://n8n.zeeshanai.cloud/webhook/a834eeb9-37b5-41a6-88af-1b2719c426c0",
  CREDITS:
    "https://n8n.zeeshanai.cloud/webhook/c02c7fce-1297-4e45-8baa-9f9c20c29329",
  USER_DATA:
    "https://n8n.zeeshanai.cloud/webhook/6fcfe67a-52c3-4ee3-a950-88a8bf5a3db0",
} as const;

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
