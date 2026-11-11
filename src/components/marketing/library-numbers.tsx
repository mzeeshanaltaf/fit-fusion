import { Fill } from "@/components/ui/fill";
import { Stat } from "@/components/ui/stat";
import { ScrollWidth } from "@/components/marketing/scroll-width";

/*
 * Counts from the live database, checked 2026-11-11 (fit_fusion schema):
 *   workout_details (deleted_at IS NULL)  250
 *   exercise_videos                       529
 *   distinct fitness_goal                   5
 *   canonical equipment names              29 (GET /v1/library/equipment)
 */
const NUMBERS = [
  { label: "Workouts", value: "250", hint: "Strength, cardio, HIIT, mobility and yoga" },
  { label: "Demo videos", value: "529", hint: "Watch the move before you load it" },
  { label: "Goals", value: "5", hint: "Fat loss, muscle gain, strength, endurance, maintenance" },
  { label: "Equipment types", value: "29", hint: "Or none at all: bodyweight is a choice" },
];

export function LibraryNumbers() {
  return (
    <Fill tone="ink" id="library" className="border-y border-border">
      <div className="grid gap-12">
        <div className="grid gap-4">
          <p className="t-label text-signal">The library</p>
          <ScrollWidth className="t-headline max-w-3xl" from={62} to={80}>
            Your plan is picked, not invented.
          </ScrollWidth>
          <p className="t-lead text-muted-foreground">
            Every workout in your plan is a real workout from a library of 250.
            We filter it by your goal, level and equipment. Meals are the only
            part written fresh for you.
          </p>
        </div>

        <div className="grid gap-x-8 gap-y-10 border-t-2 border-foreground pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {NUMBERS.map((n) => (
            <Stat key={n.label} size="lg" label={n.label} value={n.value} hint={n.hint} />
          ))}
        </div>
      </div>
    </Fill>
  );
}
