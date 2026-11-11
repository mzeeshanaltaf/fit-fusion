import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollWidth } from "@/components/marketing/scroll-width";
import { SAMPLE_MEALS, SAMPLE_TARGETS } from "@/components/marketing/sample-data";

export function NutritionDay() {
  const total = SAMPLE_MEALS.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );

  return (
    <section
      aria-labelledby="nutrition-title"
      className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14"
    >
      <div className="grid content-start gap-4">
        <p className="t-label text-signal">Nutrition</p>
        <ScrollWidth as="h2" className="t-headline" from={62} to={80}>
          <span id="nutrition-title">One day, to the gram.</span>
        </ScrollWidth>
        <p className="t-lead text-muted-foreground">
          Your calorie and macro targets come from your age, weight, height,
          goal and training days. The meals are written to hit them, and to
          respect your diet and allergies. You get 5 days like this one.
        </p>
      </div>

      <div className="min-w-0">
        <Table aria-label="Sample nutrition day: meals, calories and macros">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Meal</TableHead>
              <TableHead numeric>kcal</TableHead>
              <TableHead numeric>P</TableHead>
              <TableHead numeric>C</TableHead>
              <TableHead numeric>F</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SAMPLE_MEALS.map((m) => (
              <TableRow key={m.slot} className="hover:bg-transparent">
                <TableCell className="min-w-56 whitespace-normal">
                  <span className="t-label block text-muted-foreground">{m.slot}</span>
                  <span className="font-medium">{m.meal}</span>
                </TableCell>
                <TableCell numeric>{m.kcal}</TableCell>
                <TableCell numeric>{m.p}</TableCell>
                <TableCell numeric>{m.c}</TableCell>
                <TableCell numeric>{m.f}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell>Day total</TableCell>
              <TableCell numeric>{total.kcal.toLocaleString("en-US")}</TableCell>
              <TableCell numeric>{total.p}</TableCell>
              <TableCell numeric>{total.c}</TableCell>
              <TableCell numeric>{total.f}</TableCell>
            </TableRow>
          </TableFooter>
          <TableCaption>
            Sample day for a pescatarian, 34, 82 kg, fat loss. Target:{" "}
            {SAMPLE_TARGETS.kcal} kcal, {SAMPLE_TARGETS.protein} g protein,{" "}
            {SAMPLE_TARGETS.carbs} g carbs, {SAMPLE_TARGETS.fat} g fat. P, C, F
            in grams.
          </TableCaption>
        </Table>
      </div>
    </section>
  );
}
