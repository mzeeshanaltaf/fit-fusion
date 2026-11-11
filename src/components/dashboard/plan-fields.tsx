"use client";

import { useId, useState, type ReactNode } from "react";
import { XIcon } from "lucide-react";
import { ChipGroup, ChipGroupItem } from "@/components/ui/chip";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DIET_OPTIONS,
  FITNESS_GOALS,
  GENDER_OPTIONS,
  LIMITS,
  TRAINING_LEVELS,
} from "@/lib/constants";
import { sentence } from "@/lib/format";
import {
  allergyProblem,
  type EquipmentMode,
  type FormErrors,
  type PlanFormState,
} from "./plan-form";

interface PlanFieldsProps {
  value: PlanFormState;
  onChange: (next: PlanFormState) => void;
  errors?: FormErrors;
  /** Canonical equipment names from GET /library/equipment; null while loading. */
  equipmentOptions: string[] | null;
  equipmentFailed?: boolean;
}

function FieldGroup({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className="grid gap-5 border-t-2 border-foreground pt-4"
    >
      <h3 id={headingId} className="t-label">
        {legend}
      </h3>
      {children}
    </div>
  );
}

function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  id,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | "";
  onChange: (v: T) => void;
  error?: string;
  id: string;
}) {
  return (
    <Field>
      <FieldLabel id={`${id}-label`}>{label}</FieldLabel>
      <ChipGroup
        type="single"
        value={value}
        // Radix reports "" when the selected chip is pressed again; a required choice stays set.
        onValueChange={(v) => v && onChange(v as T)}
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {options.map((o) => (
          <ChipGroupItem key={o.value} value={o.value}>
            {o.label}
          </ChipGroupItem>
        ))}
      </ChipGroup>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  );
}

function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  min,
  max,
  step,
  placeholder,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  min: number;
  max: number;
  step?: string;
  placeholder: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step ?? "any"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        className="t-num"
      />
      <FieldHint id={`${id}-hint`}>{hint}</FieldHint>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  );
}

function AllergyInput({
  value,
  onChange,
  id,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  id: string;
}) {
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  function commit(raw: string) {
    const v = raw.trim().replace(/,+$/, "").trim();
    if (!v) {
      setText("");
      setProblem(null);
      return;
    }
    const issue = allergyProblem(v, value);
    if (issue) {
      setProblem(issue);
      return;
    }
    if (!value.some((a) => a.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setText("");
    setProblem(null);
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>Allergies or foods to avoid</FieldLabel>
      <Input
        id={id}
        value={text}
        placeholder="e.g. peanuts"
        maxLength={LIMITS.allergies.maxLength + 1}
        onChange={(e) => {
          const next = e.target.value;
          if (next.includes(",")) commit(next);
          else {
            setText(next);
            setProblem(null);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // Enter adds the item; it must not submit the form.
            commit(text);
          } else if (e.key === "Backspace" && !text && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit(text)}
        aria-invalid={!!problem}
        aria-describedby={`${id}-hint${problem ? ` ${id}-error` : ""}`}
      />
      <FieldHint id={`${id}-hint`}>
        Type one and press Enter. We keep these out of every meal. Up to {LIMITS.allergies.maxItems}.
      </FieldHint>
      <FieldError id={`${id}-error`}>{problem}</FieldError>
      {value.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-2" aria-label="Foods to avoid">
          {value.map((a) => (
            <li
              key={a}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-input bg-card pr-1 pl-3 text-sm font-semibold"
            >
              {sentence(a)}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== a))}
                className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md hover:bg-accent"
                aria-label={`Remove ${a}`}
              >
                <XIcon aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

const EQUIPMENT_MODES: readonly { value: EquipmentMode; label: string }[] = [
  { value: "any", label: "Any equipment" },
  { value: "bodyweight", label: "Bodyweight only" },
  { value: "pick", label: "Choose what I have" },
];

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** All the plan inputs, shared by the Generate form and the Settings profile. */
export function PlanFields({
  value,
  onChange,
  errors = {},
  equipmentOptions,
  equipmentFailed,
}: PlanFieldsProps) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const set = <K extends keyof PlanFormState>(key: K, v: PlanFormState[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-8">
      <FieldGroup legend="You">
        <div className="grid gap-5 sm:grid-cols-3">
          <NumberField
            id={id("age")}
            label="Age"
            hint="15 to 100"
            placeholder="30"
            min={LIMITS.age.min}
            max={LIMITS.age.max}
            step="1"
            value={value.age}
            onChange={(v) => set("age", v)}
            error={errors.age}
          />
          <NumberField
            id={id("weight")}
            label="Weight (kg)"
            hint="25 to 350"
            placeholder="75"
            min={LIMITS.weight_kg.min}
            max={LIMITS.weight_kg.max}
            value={value.weight_kg}
            onChange={(v) => set("weight_kg", v)}
            error={errors.weight_kg}
          />
          <NumberField
            id={id("height")}
            label="Height (cm)"
            hint="100 to 250"
            placeholder="175"
            min={LIMITS.height_cm.min}
            max={LIMITS.height_cm.max}
            value={value.height_cm}
            onChange={(v) => set("height_cm", v)}
            error={errors.height_cm}
          />
        </div>
        <Choice
          id={id("gender")}
          label="Gender"
          options={GENDER_OPTIONS}
          value={value.gender}
          onChange={(v) => set("gender", v)}
          error={errors.gender}
        />
      </FieldGroup>

      <FieldGroup legend="Training">
        <Choice
          id={id("goal")}
          label="Goal"
          options={FITNESS_GOALS}
          value={value.fitness_goal}
          onChange={(v) => set("fitness_goal", v)}
          error={errors.fitness_goal}
        />
        <Choice
          id={id("level")}
          label="Level"
          options={TRAINING_LEVELS}
          value={value.training_level}
          onChange={(v) => set("training_level", v)}
          error={errors.training_level}
        />
        <Field>
          <FieldLabel id={id("days-label")}>Days a week</FieldLabel>
          <ChipGroup
            type="single"
            value={value.days_per_week === null ? "" : String(value.days_per_week)}
            onValueChange={(v) => v && set("days_per_week", Number(v))}
            aria-labelledby={id("days-label")}
            aria-describedby={errors.days_per_week ? id("days-error") : id("days-hint")}
          >
            {DAYS.map((d) => (
              <ChipGroupItem key={d} value={String(d)} className="t-num w-11 px-0">
                {d}
              </ChipGroupItem>
            ))}
          </ChipGroup>
          <FieldHint id={id("days-hint")}>
            One workout per day you train. If fewer workouts fit your goal and equipment, you get
            fewer days.
          </FieldHint>
          <FieldError id={id("days-error")}>{errors.days_per_week}</FieldError>
        </Field>
      </FieldGroup>

      <FieldGroup legend="Food">
        <Choice
          id={id("diet")}
          label="Diet"
          options={DIET_OPTIONS}
          value={value.diet_preference}
          onChange={(v) => set("diet_preference", v)}
        />
        <AllergyInput
          id={id("allergies")}
          value={value.allergies}
          onChange={(next) => set("allergies", next)}
        />
      </FieldGroup>

      <FieldGroup legend="Equipment">
        <Choice
          id={id("eqmode")}
          label="What can you train with?"
          options={EQUIPMENT_MODES}
          value={value.equipmentMode}
          onChange={(v) => set("equipmentMode", v)}
        />
        {value.equipmentMode === "bodyweight" && (
          <FieldHint>
            Few workouts need no equipment. Muscle gain and strength have none, and other goals may
            give you fewer days than you ask for.
          </FieldHint>
        )}
        {value.equipmentMode === "pick" && (
          <Field>
            <FieldLabel id={id("eq-label")}>Your equipment</FieldLabel>
            {equipmentOptions === null && !equipmentFailed ? (
              <div className="flex flex-wrap gap-2" aria-busy="true">
                {Array.from({ length: 10 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-24" />
                ))}
              </div>
            ) : equipmentFailed || equipmentOptions === null ? (
              <FieldError>
                Could not load the equipment list. Reload the page, or choose any equipment.
              </FieldError>
            ) : (
              <ChipGroup
                type="multiple"
                value={value.equipment}
                onValueChange={(v) => set("equipment", v)}
                aria-labelledby={id("eq-label")}
                aria-describedby={errors.equipment ? id("eq-error") : undefined}
              >
                {equipmentOptions
                  .filter((e) => e !== "bodyweight")
                  .map((e) => (
                    <ChipGroupItem key={e} value={e}>
                      {sentence(e)}
                    </ChipGroupItem>
                  ))}
              </ChipGroup>
            )}
            <FieldError id={id("eq-error")}>{errors.equipment}</FieldError>
          </Field>
        )}
      </FieldGroup>
    </div>
  );
}
