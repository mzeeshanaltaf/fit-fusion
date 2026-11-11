import { cn } from "@/lib/utils";

/** Real exercise names from the workout library. */
export const TICKER_EXERCISES = [
  "Deadlifts",
  "Goblet Squats",
  "Push Press",
  "Kettlebell Swings",
  "Farmer's Carry",
  "Squats",
  "Bench Press",
  "Bent-Over Rows",
  "Overhead Press",
  "Plank",
  "Push-up to Renegade Row",
  "Alternating Dumbbell Snatch",
  "Walking Lunge with Press",
  "Burpee Broad Jump",
  "Treadmill Intervals",
  "Cat-Cow",
  "Thoracic Rotations",
  "Hip Circles",
  "Leg Swings",
  "Arm Circles",
];

function Group({ hidden }: { hidden?: boolean }) {
  return (
    <ul
      aria-hidden={hidden || undefined}
      className={cn(
        "flex shrink-0 items-center motion-reduce:shrink motion-reduce:flex-wrap",
        hidden && "ticker-dup"
      )}
    >
      {TICKER_EXERCISES.map((name) => (
        <li
          key={name}
          className="wdth-62 flex items-center text-3xl font-black whitespace-nowrap uppercase sm:text-5xl"
        >
          <span className="px-5 sm:px-8">{name}</span>
          <span aria-hidden className="text-signal">
            /
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Looping strip of exercise names. CSS only. Reduced motion: the loop stops and the
 * first set wraps as a static list (the duplicate is hidden).
 */
export function Ticker() {
  return (
    <section
      aria-label="Exercises in the library"
      className="ticker overflow-hidden border-y-2 border-foreground py-4 motion-reduce:py-6"
    >
      <div className="ticker-track">
        <Group />
        <Group hidden />
      </div>
    </section>
  );
}
